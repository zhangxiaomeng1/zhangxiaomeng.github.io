# -*- coding: UTF-8 -*-
from flask import Flask, jsonify
import subprocess
import os
import threading
import logging
import glob
from datetime import datetime
import psutil

# 配置日志记录
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

app = Flask(__name__)

@app.route('/')
def index():
    return app.send_static_file('index.html')


if __name__ == '__main__':
    # 关闭已存在的服务器进程
    for proc in psutil.process_iter(['pid', 'name']):
        try:
            # 获取进程的所有连接
            connections = proc.connections()
            for conn in connections:
                if hasattr(conn, 'laddr') and hasattr(conn.laddr, 'port') and conn.laddr.port == 8008:
                    proc.kill()
                    logging.info(f'关闭已存在的服务器进程: {proc.pid}')
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.Error):
            continue
    # 设置static_folder为当前目录，这样可以直接访问index.html
    app.static_folder = os.path.dirname(os.path.abspath(__file__))
    logging.info('服务器正在启动...')
    app.run(host='0.0.0.0', port=8008)