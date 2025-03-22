
import os

import json

import requests

from firebase_functions import https_fn

from firebase_admin import initialize_app

# Create main.py with the Claude proxy function
cat > main.py << 'EOL'
import os
import json
import requests
from firebase_functions import https_fn
from firebase_admin import initialize_app

initialize_app()

@https_fn.on_call()
def claude_proxy(request: https_fn.CallableRequest) -> dict:
    # Verify user is authenticated
    if not request.auth:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.UNAUTHENTICATED,
            message="User must be authenticated to use this feature."
        )
    
    try:
        # Get Claude API key from environment
        api_key = os.environ.get("CLAUDE_API_KEY", "")
        
        if not api_key:
            # Try to get from functions config
            from firebase_functions import params
            api_key = params.CLAUDE_API_KEY.value
            
        if not api_key:
            raise ValueError("Claude API key not configured")
        
        # Get data from request
        data = request.data
        system = data.get("system", "")
        messages = data.get("messages", [])
        
        # Call Claude API
        response = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "Content-Type": "application/json",
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01"
            },
            json={
                "model": "claude-3-7-sonnet-20240307",
                "max_tokens": 1000,
                "system": system,
                "messages": messages
            }
        )
        
        response.raise_for_status()
        result = response.json()
        
        return result
    
    except Exception as e:
        print(f"Error in claude_proxy: {str(e)}")
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INTERNAL,
            message=str(e)
        )
