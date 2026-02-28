import os
import shutil
import zipfile

def create_developer_zip():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    zip_filename = 'QuranBuilding_Developer_Source.zip'
    
    # Files and folders to include
    include_paths = [
        'backend',
        'frontend',
        'requirements.txt',
        '.env',
        'build_pro.py',
        'server_pro.py',
        'DEVELOPER_GUIDE.md',
        'TAJWEED_ENGINE_GUIDE.md',
        'START_APP.bat',
        'QuranBuildingPro.spec'
    ]
    
    # Exclude patterns
    exclude_patterns = [
        'node_modules',
        '__pycache__',
        '.venv',
        '.next',
        'out',
        'dist',
        'build',
        'recordings',
        'static', # Inside backend, generated from frontend
        'quran_pages' # Too heavy for zip
    ]

    with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for item in include_paths:
            full_path = os.path.join(base_dir, item)
            if not os.path.exists(full_path):
                continue
                
            if os.path.isfile(full_path):
                zipf.write(full_path, item)
            elif os.path.isdir(full_path):
                for root, dirs, files in os.walk(full_path):
                    # Filter out excluded directories
                    dirs[:] = [d for d in dirs if d not in exclude_patterns]
                    
                    for file in files:
                        if file in exclude_patterns or any(p in root for p in exclude_patterns):
                            continue
                        file_path = os.path.join(root, file)
                        arcname = os.path.relpath(file_path, base_dir)
                        zipf.write(file_path, arcname)
                        
    print(f"Zip created: {zip_filename}")

if __name__ == "__main__":
    create_developer_zip()
