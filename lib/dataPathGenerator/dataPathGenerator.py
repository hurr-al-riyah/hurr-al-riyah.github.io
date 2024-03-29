import os
import json

def list_csv_files(directory):
    return [file for file in os.listdir(directory) if file.endswith('.csv')]

def generate_json_structure(base_directory):
    json_structure = {}

    for subdir in os.listdir(base_directory):
        dir_path = os.path.join(base_directory, subdir)
        
        if os.path.isdir(dir_path):
            json_structure[subdir] = list_csv_files(dir_path)
    
    return json_structure

print(os.getcwd())

base_directory = 'hurr-al-riyah.github.io/data/시니어_0224'

json_data = generate_json_structure(base_directory)

json_str = json.dumps(json_data, indent=4, ensure_ascii=False)
print(json_str)
