import os
import sys

# Get the current directory (api/)
current_dir = os.path.dirname(os.path.abspath(__file__))
# Parent directory (project root)
root_dir = os.path.dirname(current_dir)
# Backend directory
backend_dir = os.path.join(root_dir, 'backend')

# Add backend to sys.path so 'app' package can be imported
sys.path.append(backend_dir)

from app.main import app
