from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import boto3
import tempfile
import os
import uuid
import json
from botocore.exceptions import ClientError
import fitz
import camelot
from PIL import Image
import io
import pytesseract
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

s3_client = boto3.client("s3")
BUCKET_NAME = "file-storage-for-cloud"
client = boto3.client("bedrock-runtime", region_name="us-east-1")
model_id = "arn:aws:bedrock:us-east-1:304292228765:inference-profile/us.deepseek.r1-v1:0"


@app.get("/")
def root():
    return {"message": "landed successfully"}

def extract_text(pdf_path):
    doc = fitz.open(pdf_path)
    full_text = "".join([page.get_text() for page in doc])
    doc.close()
    lines = full_text.strip().split("\n")
    title = lines[0] if lines else "No Title"
    abstract = "\n".join(lines[1:5]) if len(lines) > 1 else "No Abstract"
    return {"title": title, "abstract": abstract, "full_text": full_text}

def extract_tables(pdf_path):
    tables_list = []
    try:
        tables = camelot.read_pdf(pdf_path, pages="all")
        for i, table in enumerate(tables):
            tables_list.append({f"table_{i+1}": table.df.values.tolist()})
    except Exception as e:
        tables_list.append({"error": str(e)})
    return tables_list

def extract_figures(pdf_path):
    doc = fitz.open(pdf_path)
    figures_list = []
    for page_number, page in enumerate(doc):
        for img_index, img in enumerate(page.get_images(full=True)):
            xref = img[0]
            base_image = doc.extract_image(xref)
            image_bytes = base_image["image"]
            image = Image.open(io.BytesIO(image_bytes))
            ocr_text = pytesseract.image_to_string(image).strip()
            figures_list.append({
                f"page_{page_number+1}_figure_{img_index+1}": {
                    "size": image.size,
                    "ocr_text": ocr_text
                }
            })
    doc.close()
    return figures_list

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    # Generate a unique document ID
    document_id = uuid.uuid4().hex
    
    # Create a directory for this document
    doc_dir = os.path.join(UPLOAD_DIR, document_id)
    os.makedirs(doc_dir, exist_ok=True)
    
    # Save the uploaded PDF
    extension = os.path.splitext(file.filename)[1]
    pdf_filename = f"original{extension}"
    pdf_path = os.path.join(doc_dir, pdf_filename)
    
    with open(pdf_path, "wb") as f:
        f.write(await file.read())
    
    print(f"Saved file to {pdf_path}")
    
    # Extract text, tables, and figures
    text_json = extract_text(pdf_path)
    print("Text extracted")
    tables = extract_tables(pdf_path)
    print("Tables extracted")
    figures = extract_figures(pdf_path)
    print("Images extracted")
    
    # Create the extracted data structure
    extracted_data = {
        "filename": file.filename,
        "document_id": document_id,
        "text": text_json,
        "tables": tables,
        "figures": figures,
    }
    
    # Build initial context
    initial_context = "=== DOCUMENT CONTENT ===\n"
    initial_context += json.dumps(extracted_data, indent=2, ensure_ascii=False)
    initial_context += "\n\n=== CONVERSATION HISTORY ===\n"
    
    # Create context.txt file with the extracted JSON
    context_file_path = os.path.join(doc_dir, "context.txt")
    with open(context_file_path, "w", encoding="utf-8") as f:
        f.write(initial_context)
    
    # Store document metadata in Supabase
    try:
        supabase.table("document_contexts").insert({
            "document_id": document_id,
            "context": initial_context
        }).execute()
        print(f"Document {document_id} stored in Supabase")
    except Exception as e:
        print(f"Error storing document in Supabase: {str(e)}")
    
    return {
        "status": "ok",
        "document_id": document_id,
        "result": extracted_data
    }


class AskRequest(BaseModel):
    document_id: str
    question: str

@app.post("/ask")
async def ask_question(request: AskRequest):
    document_id = request.document_id
    question = request.question
    
    # Fetch context from Supabase
    try:
        result = supabase.table("document_contexts").select("context").eq("document_id", document_id).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail="Document not found in database")
        
        context = result.data[0]["context"]
        print(f"Context fetched from Supabase for document {document_id}")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching context from Supabase: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching document context")
    
    # Create the prompt with context and current question
    prompt = f"""
        You are an AI assistant that embodies the *voice* of the uploaded research document. 
        Speak naturally in the **first person**, as if you were the document itself — describing your own purpose, findings, and ideas. 
        Your goal is to provide thoughtful, accurate, and concise responses that reflect the knowledge within the document.

        Use the following information as your context and memory:
        {context}

        Now, the user has asked:
        "{question}"

        Please respond clearly, maintaining a conversational yet informative tone. 
        If relevant, refer to sections, concepts, or data from the document, but avoid breaking the first-person immersion (e.g., do not say "the document says"; instead, say "I discuss" or "I show").
    """
    
    conversation = [
        {
            "role": "user",
            "content": [{"text": prompt}]
        }
    ]
    
    def event_stream():
        full_response = ""
        try:
            response = client.converse_stream(
                modelId=model_id,
                messages=conversation,
                inferenceConfig={
                    "maxTokens": 1024,
                    "temperature": 0.7,
                    "topP": 0.9
                },
                additionalModelRequestFields={},
                performanceConfig={"latency": "standard"}
            )
            
            for event in response["stream"]:
                if "contentBlockDelta" in event:
                    delta = event["contentBlockDelta"]["delta"]
                    text = delta.get("text", "")
                    full_response += text
                    yield text
            
            # After streaming is complete, update context in Supabase
            try:
                updated_context = context + f"\n\nUser: {question}\n" + f"AI: {full_response}\n"
                
                supabase.table("document_contexts").update({
                    "context": updated_context
                }).eq("document_id", document_id).execute()
                
                print(f"Context updated in Supabase for document {document_id}")
            except Exception as e:
                print(f"Error updating context in Supabase: {str(e)}")
        
        except ClientError as e:
            error_msg = f"\nAWS Client Error: {e.response['Error']['Message']}"
            yield error_msg
        except Exception as e:
            error_msg = f"\nUnexpected error: {str(e)}"
            yield error_msg
    
    return StreamingResponse(event_stream(), media_type="text/plain")

# @app.post("/doi")
# def get_doi(document_id: str):
#     # Check if the document directory exists
#     doc_dir = os.path.join(UPLOAD_DIR, document_id)
#     if not os.path.exists(doc_dir):
#         raise HTTPException(status_code=404, detail="Document not found")
    
#     context_file_path = os.path.join(doc_dir, "context.txt")
#     if not os.path.exists(context_file_path):
#         raise HTTPException(status_code=404, detail="Context file not found")
    
#     # Read the context file to get the full text
#     with open(context_file_path, "r", encoding="utf-8") as f:
#         context = f.read()
    
#     prompt = f"""
#     Extract all valid DOI numbers from the following research paper text. 
#     - Only return the DOI as a full link in the format: https://doi.org/xxxxx
#     - Do not return any other text or explanation.
#     - If no DOI is found, return "No DOI detected".

#     Research Paper Text:
#     {context}
#     """
    
#     conversation = [
#         {
#             "role": "user",
#             "content": [{"text": prompt}]
#         }
#     ]
    
#     try:
#         response = client.converse(
#             modelId=model_id,
#             messages=conversation,
#             inferenceConfig={
#                 "maxTokens": 512,
#                 "temperature": 0.0,
#                 "topP": 0.9
#             },
#             additionalModelRequestFields={},
#             performanceConfig={"latency": "standard"}
#         )
        
#         doi_links = ""
#         for content_block in response["output"]["message"]["content"]:
#             if "text" in content_block:
#                 doi_links += content_block["text"]
        
#         return {"doi": doi_links.strip()}
    
#     except ClientError as e:
#         raise HTTPException(status_code=500, detail=f"AWS Client Error: {e.response['Error']['Message']}")
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")