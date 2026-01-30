from flask import Flask, render_template, jsonify, request, send_from_directory
from sqlcipher3 import dbapi2 as sqlite3
import os
import uuid
import json
from datetime import datetime
from ingestion_engine import IngestionEngine
from ai_engine import AIEngine
from rag_engine import get_rag_engine
from dashboard_engine import DashboardEngine
from event_engine import EventEngine
from entity_engine import EntityEngine
from forensics_engine import ForensicsEngine
from path_manager import path_manager
from settings_engine import SettingsEngine
from job_runner import job_runner
from auth_engine import auth_engine
from functools import wraps

app = Flask(__name__, static_folder="../frontend/dist")
# Increase to 32GB
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024 * 1024

# Path Management
DB_PATH = path_manager.database_path
UPLOAD_FOLDER = path_manager.uploads_path
FB_DIR = path_manager.base_dir # Approximation for simplicity, though functionality unused


ingest_engine = IngestionEngine(upload_folder=UPLOAD_FOLDER)
ai_engine = AIEngine()
dashboard_engine = DashboardEngine(db_path=DB_PATH)
event_engine = EventEngine(db_path=DB_PATH)
entity_engine = EntityEngine(db_path=DB_PATH)
forensics_engine = ForensicsEngine()
settings_engine = SettingsEngine()
from search_engine import SearchEngine
search_engine = SearchEngine()
from draft_engine import DraftEngine
draft_engine = DraftEngine()

# Initialize Backup System
from backup_engine import BackupEngine
backup_engine = BackupEngine()
backup_engine.start_background_job()

from db import get_db

def format_error(message, internal_code="INTERNAL_ERROR", status_code=500):
    """Utility to return structured error responses."""
    request_id = str(uuid.uuid4())
    return jsonify({
        "error": {
            "message": message,
            "code": internal_code,
            "requestId": request_id
        }
    }), status_code

def require_permission(capability):
    """Decorator to enforce IAM permissions."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            auth_header = request.headers.get('Authorization')
            if not auth_header:
                return format_error("Missing Authorization Header", "UNAUTHORIZED", 401)
            
            token = auth_header.replace('Bearer ', '')
            user_id = auth_engine.verify_session(token)
            
            if not user_id:
                return format_error("Invalid or expired session", "UNAUTHORIZED", 401)
            
            if not auth_engine.check_permission(user_id, capability):
                return format_error(f"Missing required permission: {capability}", "FORBIDDEN", 403)
                
            return f(*args, **kwargs)
        return decorated_function
    return decorator

@app.errorhandler(ValueError)
def handle_value_error(e):
    if "Vault Locked" in str(e):
        return jsonify({
            "error": {
                "code": "VAULT_LOCKED",
                "message": "Vault key is missing. Please restart the application.",
                "requestId": str(uuid.uuid4())
            }
        }), 423
    return format_error(str(e), "VALUE_ERROR", 400)

# Serve React App
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/search/semantic', methods=['GET'])
def search_semantic():
    query = request.args.get('q', '').strip()
    filters = {'start_date': request.args.get('start_date'), 'end_date': request.args.get('end_date')}
    try:
        results = search_engine.semantic_search(query, filters)
        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ai/draft', methods=['POST'])
def ai_draft():
    data = request.json
    messages = ai_engine.prepare_draft_context(data.get('messages', []), data.get('notes', ''))
    draft = ai_engine.generate_draft(messages, data.get('notes', ''))
    return jsonify({'draft': draft})

@app.route('/api/ai/draft/stream', methods=['POST'])
def ai_draft_stream():
    data = request.json
    messages = ai_engine.prepare_draft_context(data.get('messages', []), data.get('notes', ''))
    notes = data.get('notes', '')
    
    def generate():
        for chunk in ai_engine.generate_draft_stream(messages, notes):
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        yield "data: [DONE]\n\n"

    from flask import Response
    return Response(generate(), mimetype='text/event-stream')

@app.route('/api/ai/analyze', methods=['POST'])
def ai_analyze():
    # Placeholder: fetch events from DB or receive them
    # For now, let's just use the mock
    analysis = ai_engine.analyze_timeline([])
    return jsonify(analysis)

# Phase 5: AI Chat & Magic Edit
from chat_engine import ChatEngine
chat_engine = ChatEngine()

@app.route('/api/ai/chat', methods=['POST'])
def ai_chat_stream():
    data = request.json
    history = data.get('history', []) # [{'role': 'user', 'content': '...'}]
    query = data.get('message', '')
    
    def generate():
        for chunk in chat_engine.chat_stream(history, query):
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        yield "data: [DONE]\n\n"

    from flask import Response
    return Response(generate(), mimetype='text/event-stream')

@app.route('/api/ai/rewrite', methods=['POST'])
def ai_rewrite():
    data = request.json
    text = data.get('text', '')
    mode = data.get('mode', 'improve')
    instruction = ai_engine.get_rewrite_instruction(mode)
    rewritten = ai_engine.rewrite_text(text, instruction)
    return jsonify({'text': rewritten})

@app.route('/api/ai/vision', methods=['POST'])
def ai_vision():
    data = request.json
    filename = data.get('filename')
    
    if not filename:
        return jsonify({'error': 'Filename required'}), 400
        
    # Check if URL or Local Path
    if filename.startswith('http'):
        media_path = filename
    else:
        # Security: Ensure filename is just a basename
        import werkzeug
        filename = werkzeug.utils.secure_filename(filename)
        media_path = os.path.join(path_manager.media_path, filename)
    
    caption = ai_engine.analyze_image(media_path)
    return jsonify({'caption': caption})

@app.route('/api/stats')
def get_stats():
    return jsonify(dashboard_engine.get_stats())

@app.route('/api/health/db')
def health_db():
    try:
        conn = get_db()
        # Verify encryption/access by reading from sqlite_master
        conn.execute("SELECT count(*) FROM sqlite_master") 
        conn.close()
        return jsonify({'ok': True})
    except ValueError:
        raise  # Bubble up to global handler (423)
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500

@app.route('/api/dashboard/summary')
def get_dashboard_summary():
    data = dashboard_engine.get_summary()
    return jsonify(data)

@app.route('/api/drafts/recent')
def get_recent_drafts():
    limit = int(request.args.get('limit', 5))
    drafts = dashboard_engine.get_recent_drafts(limit)
    return jsonify(drafts)

@app.route('/api/moments/suggested')
def get_suggested_moments():
    limit = int(request.args.get('limit', 5))
    moments = dashboard_engine.get_suggested_moments(limit)
    return jsonify(moments)

@app.route('/api/dashboard/on_this_day')
def get_on_this_day():
    return jsonify(dashboard_engine.get_on_this_day())

@app.route('/api/events')
def get_events():
    # Real Timeline Implementation
    conn = get_db()
    # Aggregate messages by Month for high-level timeline
    # OR select distinct "threads" as events
    # For now, let's treat every Thread as a potential Event if it has messages
    # Or better: Messages with 'travel', 'celebration' tags are key events.
    
    # Let's fetch messages that have tags OR are long threads
    query = """
    SELECT m.id, m.content_text, m.timestamp_utc, m.tags, t.title as thread_title
    FROM messages m
    JOIN threads t ON m.thread_id = t.id
    ORDER BY m.timestamp_utc DESC
    LIMIT 50
    """
    rows = conn.execute(query).fetchall()
    
    events = []
    for r in rows:
        tags = json.loads(r['tags']) if r['tags'] else []
        # Filter: Only tagged items or long messages?
        # For MVP, return everything as an "Event" to populate the UI
        events.append({
            'id': r['id'],
            'title': r['thread_title'] or 'Conversation',
            'start_date': datetime.fromtimestamp(r['timestamp_utc']).isoformat(),
            'end_date': datetime.fromtimestamp(r['timestamp_utc']).isoformat(), # Point event
            'category': tags[0] if tags else 'general',
            'description': r['content_text'][:100] + '...'
        })
    conn.close()
    return jsonify(events)

@app.route('/api/entities/populate', methods=['POST'])
def populate_entities():
    added = entity_engine.populate_entities()
    return jsonify({'added': added})

@app.route('/api/entities')
def get_entities():
    entities = entity_engine.get_entities()
    return jsonify(entities)

@app.route('/api/entities/merge', methods=['POST'])
def merge_entities():
    data = request.json
    target_id = data.get('target_id')
    source_ids = data.get('source_ids')
    
    if not target_id or not source_ids:
        return jsonify({'error': 'Missing target_id or source_ids'}), 400
        
    try:
        result = entity_engine.merge_entities(target_id, source_ids)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/events/autodetect', methods=['POST'])
def autodetect_events():
    count = event_engine.autodetect_events()
    return jsonify({'events_found': count})

@app.route('/api/events')
def list_events():
    events = event_engine.list_events()
    return jsonify(events)

@app.route('/api/events/<event_id>/messages', methods=['GET'])
def get_event_messages(event_id):
    result = event_engine.get_event_messages(event_id)
    if not result:
        return jsonify({'error': 'Event not found'}), 404
        
    return jsonify(result)

@app.route('/api/timeline')
def timeline_data():
    return jsonify(dashboard_engine.get_timeline())

# --- DRAFTS PERSISTENCE API ---

@app.route('/api/drafts', methods=['POST'])
@require_permission('content_write')
def create_draft():
    data = request.json
    try:
        result = draft_engine.create_draft(
            data.get('title', 'Untitled Draft'),
            data.get('content', ''),
            data.get('status', 'draft'),
            data.get('evidence_ids', [])
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/drafts/<draft_id>', methods=['GET'])
def get_draft(draft_id):
    result = draft_engine.get_draft(draft_id)
    if not result:
        return jsonify({'error': 'Draft not found'}), 404
    return jsonify(result)

@app.route('/api/drafts/<draft_id>', methods=['PUT'])
@require_permission('content_write')
def update_draft(draft_id):
    data = request.json
    try:
        result = draft_engine.update_draft(
            draft_id,
            title=data.get('title'),
            content=data.get('content'),
            status=data.get('status'),
            evidence_ids=data.get('evidence_ids')
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- SETTINGS API ---

@app.route('/api/settings', methods=['GET'])
def get_settings():
    return jsonify(settings_engine.get_all())

@app.route('/api/settings', methods=['POST'])
@require_permission('vault_admin')
def update_settings():
    data = request.json
    # Allow bulk update
    settings_engine.set_all(data)
    return jsonify({'success': True})

@app.route('/api/settings/reset', methods=['POST'])
@require_permission('vault_admin')
def reset_database():
    try:
        # 1. Reset
        settings_engine.reset_database(DB_PATH)
        # 2. Re-init schema
        from db import init_db
        init_db()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/settings/export', methods=['GET'])
@require_permission('export_full')
def export_data():
    try:
        # Base dir is where `autobiography.db` and `media/` live
        # path_manager.data_dir? No, `path_manager.base_dir` seems to be used elsewhere? 
        # Check path_manager reference in app.py: 
        # DB_PATH = path_manager.database_path
        # UPLOAD_FOLDER = path_manager.uploads_path
        # The base app data dir is `path_manager.app_data_dir` usually.
        # Let's verify path_manager usage.
        
        # Using path_manager.base_dir (from app.py line 21, though seemingly unused)
        # Assuming path_manager.app_data_dir is the root of what we want to export.
        
        base_dir = os.path.dirname(DB_PATH) # Likely safer
        zip_path = settings_engine.export_data(base_dir)
        
        from flask import send_file
        return send_file(zip_path, as_attachment=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/dlq', methods=['GET'])
def get_ingestion_errors():
    errors = ingest_engine.get_dlq_errors()
    return jsonify(errors)

@app.route('/api/ingest/status/recent', methods=['GET'])
def get_recent_ingest_status():
    return jsonify(ingest_engine.get_recent_batch_status())

@app.route('/api/system/reindex', methods=['POST'])
def system_reindex():
    """Rebuilds Chroma Vector Index from SQLite messages. Also ensures FTS is synced."""
    try:
        result = ingest_engine.reindex_all()
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- INGESTION JOBS & PAGINATION API ---

@app.route('/api/ingest/jobs/<job_id>', methods=['GET'])
def get_ingestion_job(job_id):
    result = ingest_engine.get_job_status(job_id)
    if not result:
        return jsonify({'error': 'Job not found'}), 404
    return jsonify(result)

@app.route('/api/messages', methods=['GET'])
def list_messages():
    thread_id = request.args.get('thread_id')
    limit = int(request.args.get('limit', 50))
    offset = int(request.args.get('offset', 0))
    last_id = request.args.get('last_id')
    return jsonify(search_engine.list_messages(thread_id, limit, offset, last_id))

# --- DRAFTING BOARD API ---

@app.route('/api/chapters', methods=['GET'])
def list_chapters():
    return jsonify(draft_engine.list_chapters())

@app.route('/api/chapters', methods=['POST'])
def create_chapter():
    data = request.json
    return jsonify(draft_engine.create_chapter(data.get('title', 'Untitled Chapter'), data.get('index', 0)))

@app.route('/api/chapters/<chapter_id>', methods=['GET'])
def get_chapter(chapter_id):
    result = draft_engine.get_chapter(chapter_id)
    if not result:
        return jsonify({'error': 'Not found'}), 404
    return jsonify(result)

@app.route('/api/scenes', methods=['POST'])
def create_scene():
    data = request.json
    return jsonify(draft_engine.create_scene(data.get('chapter_id'), data.get('title', 'New Scene'), data.get('event_id')))

# --- TRIAGE CONSOLE API ---

@app.route('/api/threads', methods=['GET'])
def list_threads():
    return jsonify(search_engine.list_threads())

@app.route('/api/threads/update', methods=['POST'])
def update_threads():
    data = request.json
    ids = data.get('thread_ids', [])
    action = data.get('action')
    value = data.get('value')
    try:
        result = search_engine.update_threads(ids, action, value)
        return jsonify(result)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/search', methods=['GET'])
def search_messages():
    query_text = request.args.get('q', '').strip()
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    entity_id = request.args.get('entity_id')
    return jsonify(search_engine.search_messages(query_text, start_date, end_date, entity_id))

@app.route('/api/chapters/<chapter_id>', methods=['PUT'])
def update_chapter(chapter_id):
    data = request.json
    return jsonify(draft_engine.update_chapter(chapter_id, data.get('content'), data.get('title')))

@app.route('/api/export/book', methods=['GET'])
def export_book():
    return jsonify({'markdown': draft_engine.export_book()})

# --- STORY ARCS API ---

@app.route('/api/arcs', methods=['GET'])
def list_arcs():
    return jsonify(draft_engine.list_arcs())

@app.route('/api/arcs', methods=['POST'])
def create_arc():
    data = request.json
    return jsonify(draft_engine.create_arc(data.get('title', 'Untitled Arc')))

@app.route('/api/arcs/assign', methods=['POST'])
def assign_event():
    data = request.json
    return jsonify(draft_engine.assign_event_to_arc(data.get('event_id'), data.get('arc_id')))

# --- INGESTION API (Phase 1) ---

@app.route('/api/import/upload/chunk', methods=['POST'])
def upload_chunk():
    upload_id = request.form.get('upload_id')
    chunk_index = int(request.form.get('chunk_index'))
    file = request.files['file']
    if not upload_id or file is None:
        return jsonify({'error': 'Missing upload_id or file'}), 400
    try:
        result = ingest_engine.handle_chunk_upload(upload_id, chunk_index, file.read())
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/import/upload/complete', methods=['POST'])
def complete_upload():
    upload_id = request.json.get('upload_id')
    filename = request.json.get('filename')
    if not upload_id or not filename:
        return jsonify({'error': 'Missing upload_id or filename'}), 400
    try:
        result = ingest_engine.complete_chunk_upload(upload_id, filename)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/import/upload', methods=['POST'])
@require_permission('data_import')
def upload_import():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    if file:
        filename = file.filename
        # Save temp
        if not os.path.exists(UPLOAD_FOLDER):
            os.makedirs(UPLOAD_FOLDER)
        path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(path)
        
        try:
            # Create Batch & Process
            batch_id = ingest_engine.create_batch(filename)
            ingest_engine.process_background(batch_id, path)
            
            return jsonify({'batch_id': batch_id, 'message': 'Upload accepted, processing started.'})
        except Exception as e:
            return jsonify({'error': f"Injest failure: {str(e)}"}), 500

@app.route('/api/import/path', methods=['POST'])
def import_local_path():
    data = request.json
    path = data.get('path')
    
    if not path:
        return jsonify({'error': 'Path required'}), 400
        
    if not os.path.exists(path):
        return jsonify({'error': 'Path does not exist'}), 400
        
    # Check if directory or file
    is_directory = os.path.isdir(path)
    filename = os.path.basename(path)
    
    try:
        source_type = 'local_directory' if is_directory else 'local_file'
        batch_id = ingest_engine.create_batch(filename, source_type=source_type)
        ingest_engine.process_background(batch_id, path, is_directory=is_directory)
        
        return jsonify({'batch_id': batch_id, 'message': 'Path accepted, processing started.'})
    except Exception as e:
        return jsonify({'error': f"Ingest failure: {str(e)}"}), 500

@app.route('/api/import/batches', methods=['GET'])
def list_import_batches():
    return jsonify(ingest_engine.list_batches())

@app.route('/api/import/batch/<batch_id>', methods=['GET'])
def get_batch_status(batch_id):
    result = ingest_engine.get_batch_status(batch_id)
    if not result:
        return jsonify({'error': 'Batch not found'}), 404
    return jsonify(result)

# --- CONVERSATION FORENSICS API ---

@app.route('/api/forensics/start', methods=['POST'])
def forensics_start():
    data = request.json
    person_id = data.get('person_id')
    transcript_id = data.get('transcript_id')
    variables = data.get('variables', {})
    
    if not person_id:
        return jsonify({'error': 'person_id is required'}), 400
        
    try:
        run_id = forensics_engine.create_run(person_id, transcript_id, variables)
        return jsonify({'run_id': run_id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/forensics/participants', methods=['GET'])
def forensics_participants():
    path = request.args.get('path')
    if not path:
        return jsonify({'error': 'path is required'}), 400
    
    # Security: Ensure path is within vault or allowed folder
    # Security check using path_manager
    allowed = [path_manager.base_dir, path_manager.vault_dir, os.getcwd()]
    is_safe = any(path.startswith(str(p)) for p in allowed)
    if not is_safe:
        return jsonify({'error': 'Access denied'}), 403

    try:
        labels = forensics_engine.scan_participants(path)
        return jsonify({'labels': labels})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/forensics/resolve', methods=['POST'])
def forensics_resolve():
    data = request.json
    run_id = data.get('run_id')
    mapping = data.get('mapping') # { "Label": "PER_ID" }
    
    if not run_id or not mapping:
        return jsonify({'error': 'run_id and mapping are required'}), 400
        
    try:
        success = forensics_engine.resolve_participants(run_id, mapping)
        return jsonify({'success': success})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/forensics/run', methods=['POST'])
@require_permission('forensics_run')
def forensics_execute():
    data = request.json
    run_id = data.get('run_id')
    
    if not run_id:
        return jsonify({'error': 'run_id is required'}), 400
        
    # Create and submit unified job
    job_id = job_runner.create_job('forensics', {'run_id': run_id})
    job_runner.submit_job(job_id, forensics_engine.execute_with_progress, job_id, run_id)
    
    return jsonify({'status': 'running', 'message': 'Forensics analysis started in background.', 'job_id': job_id})

@app.route('/api/forensics/status/<run_id>', methods=['GET'])
def forensics_status(run_id):
    status = forensics_engine.get_run_status(run_id)
    if not status:
        return jsonify({'error': 'Run not found'}), 404
    return jsonify(status)



@app.route('/api/forensics/file/<path:filepath>', methods=['GET'])
def serve_forensics_file(filepath):
    # Security: Only serve files from the forensics directories
    abs_path = os.path.abspath(filepath)
    if not abs_path.startswith(path_manager.base_dir):
        return jsonify({'error': 'Access denied'}), 403
    
    if not os.path.exists(abs_path):
        return jsonify({'error': 'File not found'}), 404
        
    return send_file(abs_path, mimetype='text/markdown')

# --- UNIFIED BACKGROUND JOB SYSTEM API ---

@app.route('/api/jobs/<job_id>', methods=['GET'])
def get_job(job_id):
    """
    Get job status and details.
    Returns: {id, type, status, progress, created_at, updated_at, completed_at, result_ref, error_msg}
    """
    job = job_runner.get_job_status(job_id)
    if not job:
        return jsonify({'error': 'Job not found'}), 404
    return jsonify(job)

@app.route('/api/jobs', methods=['GET'])
def list_jobs():
    """
    List jobs with optional filters.
    Query params: type, status, limit, offset
    """
    job_type = request.args.get('type')
    status = request.args.get('status')
    limit = int(request.args.get('limit', 50))
    offset = int(request.args.get('offset', 0))
    
    jobs = job_runner.list_jobs(job_type=job_type, status=status, limit=limit, offset=offset)
    return jsonify(jobs)

@app.route('/api/jobs/<job_id>/cancel', methods=['POST'])
def cancel_job(job_id):
    """
    Cancel a running job.
    """
    success = job_runner.cancel_job(job_id)
    if success:
        return jsonify({'message': 'Job cancelled'})
    else:
        return jsonify({'error': 'Job not running or not found'}), 400

@app.route('/api/jobs/<job_id>', methods=['DELETE'])
def delete_job(job_id):
    """
    Delete a completed/failed job record.
    """
    success = job_runner.delete_job(job_id)
    if success:
        return jsonify({'message': 'Job deleted'})
    else:
        return jsonify({'error': 'Cannot delete running job'}), 400

@app.route('/api/jobs/<job_id>/stream', methods=['GET'])
def stream_job_progress(job_id):
    """
    Server-Sent Events stream for real-time job progress.
    Events: progress, status_change, completed, failed
    """
    def generate():
        # Simple polling-based SSE implementation
        # In production, use a proper pub/sub system
        import time
        last_status = None
        last_progress = None
        
        while True:
            job = job_runner.get_job_status(job_id)
            if not job:
                yield f"data: {{\"error\": \"Job not found\"}}\n\n"
                break
                
            # Send update if status or progress changed
            if job['status'] != last_status or job['progress'] != last_progress:
                yield f"data: {json.dumps(job)}\n\n"
                last_status = job['status']
                last_progress = job['progress']
                
            # Stop streaming if job is done
            if job['status'] in ['completed', 'failed', 'cancelled']:
                break
                
            time.sleep(1)  # Poll every second
    
    return Response(generate(), mimetype='text/event-stream')

# --- AUTHENTICATION API ---

@app.route('/api/auth/signup', methods=['POST'])
def auth_signup():
    """Create new user account."""
    data = request.json
    if not data or not all(k in data for k in ('full_name', 'email', 'password')):
        return format_error("Missing required fields (full_name, email, password)", "MISSING_FIELDS", 400)
    
    try:
        user_id, token = auth_engine.create_user(
            data['full_name'],
            data['email'],
            data['password']
        )
        return jsonify({'user_id': user_id, 'token': token})
    except ValueError as e:
        return format_error(str(e), "BAD_REQUEST", 400)
    except Exception as e:
        print(f"[Auth] Signup error: {e}")
        return format_error("Signup failed due to an internal server error", "SIGNUP_FAILED", 500)

@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    """Authenticate user and create session."""
    data = request.json
    if not data or not all(k in data for k in ('email', 'password')):
        return format_error("Missing required fields (email, password)", "MISSING_FIELDS", 400)
    
    try:
        user_id, token = auth_engine.login(
            data['email'],
            data['password'],
            data.get('remember', False)
        )
        return jsonify({'user_id': user_id, 'token': token})
    except ValueError as e:
        # Auth errors are usually returned as 401 Unauthorized
        return format_error(str(e), "UNAUTHORIZED", 401)
    except Exception as e:
        print(f"[Auth] Login error: {e}")
        return format_error("Login failed due to an internal server error", "LOGIN_FAILED", 500)

@app.route('/api/auth/logout', methods=['POST'])
def auth_logout():
    """Invalidate session token."""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if token:
        auth_engine.logout(token)
    return jsonify({'message': 'Logged out'})

@app.route('/api/auth/me', methods=['GET'])
def auth_me():
    """Get current user information."""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = auth_engine.verify_session(token)
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    
    user = auth_engine.get_user(user_id)
    return jsonify(user)

if __name__ == '__main__':
    app.run(debug=True, port=5001)
