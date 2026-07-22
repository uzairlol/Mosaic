import sys
import os

# Add root directory to python path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from mosaic.server.app import app
