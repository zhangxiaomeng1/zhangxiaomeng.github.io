import http.server
import socketserver
import os
import socket
import sys

# 尝试不同的端口
PORT = 8005

# 尝试查找可用端口
def find_free_port(start_port):
    port = start_port
    max_port = start_port + 20  # 最多尝试20个端口
    
    while port < max_port:
        try:
            # 尝试绑定端口
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('', port))
                return port
        except OSError:
            # 端口被占用，尝试下一个
            port += 1
    
    # 如果所有端口都被占用，抛出异常
    raise OSError(f"无法找到可用端口，从{start_port}到{max_port-1}的所有端口都被占用")

# 自定义处理器，将根路径请求重定向到home.html
class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # 如果请求根路径，重定向到home.html
        if self.path == '/':
            self.path = '/index.html'
        return http.server.SimpleHTTPRequestHandler.do_GET(self)

# 查找可用端口
try:
    PORT = find_free_port(PORT)
    print(f"找到可用端口: {PORT}")
except OSError as e:
    print(f"错误: {e}")
    sys.exit(1)

try:
    with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
        print(f"Server running at http://localhost:{PORT}")
        print(f"访问 http://localhost:{PORT} 可以看到导航页面")
        httpd.serve_forever()
except KeyboardInterrupt:
    print("\n服务器已停止")
except Exception as e:
    print(f"服务器启动失败: {e}")
    sys.exit(1)