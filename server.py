import http.server
import socketserver

PORT = 8001
HANDLER = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer(("", PORT), HANDLER) as httpd:
    print(f"Server running at http://localhost:{PORT}")
    httpd.serve_forever()