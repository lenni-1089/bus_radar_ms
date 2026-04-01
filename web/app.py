from flask import Flask, send_from_directory
import os
import datetime
import load_dotenv

app = Flask(__name__)

html_folder = ''


@app.route('')
def index():
    path = os.getcwd() + 'templates/'
    return send_from_directory(directory=path, path='index.html')


@app.route('/stream')
def stream():


