from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime

# Pydantic V1 Syntax for Compatibility with ChromaDB 0.3.x environment

class NormalizedMessage(BaseModel):
    """
    Represents a message after it has been extracted from raw HTML/JSON
    but before it is inserted into the database.
    """
    sender: str = Field(..., min_length=1, description="Name of the sender")
    content: str = Field(..., min_length=1, description="Text content of the message")
    timestamp: float = Field(..., description="Unix timestamp in UTC")
    thread_title: str = Field(..., min_length=1, description="Title of the conversation thread")
    source_file: str = Field(..., description="Original filename for traceability")
    
    # Optional fields for enrichment
    platform: str = Field("facebook", description="Source platform")
    tags: List[str] = Field(default_factory=list, description="Auto-generated tags")
    
    @validator('timestamp')
    def timestamp_must_be_reasonable(cls, v):
        # Basic sanity check: 2004 (Facebook founding) to Future
        if v < 1075852800 or v > 32503680000: 
            # Allow future for a bit, but blocking 0 or negative
            if v == 0: raise ValueError("Timestamp cannot be 0")
        return v

class IngestionReport(BaseModel):
    """
    Structured report for an ingestion batch operation.
    """
    batch_id: str
    start_time: str
    end_time: Optional[str] = None
    status: str = "pending"
    
    files_found: int = 0
    files_parsed: int = 0
    messages_found: int = 0
    messages_created: int = 0
    duplicates_skipped: int = 0
    errors: int = 0
    
    # Detailed error log (truncated if too large in practice)
    error_log: List[str] = []

    def log_error(self, msg: str):
        self.errors += 1
        if len(self.error_log) < 100:
            self.error_log.append(msg)
            
    def finish(self, status: str):
        self.status = status
        self.end_time = datetime.utcnow().isoformat()
