import os
import requests
from firebase_admin import initialize_app
from firebase_functions import https_fn, options

# Inicializar Firebase
initialize_app()

# Token secreto que tú inventas para validar el Webhook en Meta
VERIFY_TOKEN = os.environ.get("VERIFY_TOKEN", "mi_codigo_secreto_123")

@https_fn.on_request(cors=options.CorsOptions(cors_origins="*", cors_methods=["get", "post"]))
def whatsapp_webhook(req: https_fn.Request) -> https_fn.Response:
    """
    Ruta: /whatsapp_webhook
    Maneja la validación de Meta (GET) y recibe mensajes entrantes (POST)
    """
    if req.method == 'GET':
        # Paso 1: Validación del Webhook por parte de Meta
        mode = req.args.get("hub.mode")
        token = req.args.get("hub.verify_token")
        challenge = req.args.get("hub.challenge")

        if mode == "subscribe" and token == VERIFY_TOKEN:
            return https_fn.Response(challenge, status=200)
        
        return https_fn.Response("Forbidden", status=403)

    elif req.method == 'POST':
        # Paso 2: Meta te envía los mensajes que escriben tus clientes
        body = req.get_json(silent=True)
        print("Mensaje entrante de WhatsApp:", body)
        
        # Opcional: Aquí extraerías el texto y lo guardarías en Firestore
        
        # Meta requiere una respuesta rápida 200 OK
        return https_fn.Response("OK", status=200)

    return https_fn.Response("Method Not Allowed", status=405)


@https_fn.on_request(cors=options.CorsOptions(cors_origins="*", cors_methods=["post"]))
def enviar_mensaje(req: https_fn.Request) -> https_fn.Response:
    """
    Ruta: /enviar_mensaje
    Tu frontend en React hace una petición POST aquí para enviar un mensaje.
    """
    WHATSAPP_TOKEN = os.environ.get("WHATSAPP_TOKEN")
    PHONE_NUMBER_ID = os.environ.get("PHONE_NUMBER_ID")

    data = req.get_json(silent=True)
    if not data:
         return https_fn.Response('{"error": "Cuerpo JSON inválido"}', status=400, mimetype='application/json')

    telefono = data.get("telefono")
    mensaje = data.get("mensaje")

    if not telefono or not mensaje:
        return https_fn.Response('{"error": "Faltan datos (teléfono o mensaje)"}', status=400, mimetype='application/json')

    # Limpiar el formato del teléfono (sin +, sin espacios)
    telefono_limpio = str(telefono).replace("+", "").replace(" ", "")

    url = f"https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {WHATSAPP_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": telefono_limpio,
        "type": "text",
        "text": {"body": mensaje}
    }

    try:
        # Petición oficial a Meta para enviar el mensaje
        res = requests.post(url, headers=headers, json=payload)
        # Retornamos a React exactamente lo que Meta nos responde
        return https_fn.Response(res.text, status=res.status_code, mimetype='application/json')
    except Exception as e:
        return https_fn.Response(f'{{"error": "{str(e)}"}}', status=500, mimetype='application/json')