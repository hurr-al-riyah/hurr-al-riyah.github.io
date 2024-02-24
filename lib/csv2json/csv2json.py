import csv
import json

csv_file_path = 'hurr-al-riyah.github.io/lib/csv2json/data/stat_0224.csv'
json_file_path = 'hurr-al-riyah.github.io/lib/csv2json/data/umaStats.json'

new_data = {}

def convert_csv_to_json(csv_file_path, json_file_path):
    data = {}

    with open(csv_file_path, mode='r', encoding='utf-8-sig') as file:
        csv_reader = csv.reader(file)
        first_row = next(csv_reader)

        race_key = first_row[0]
        print(race_key)
        headers = first_row[1:]

        for row in csv_reader:
            horse_name = row[0] 
            stats = {header: row[i+1] for i, header in enumerate(headers)}

            data[horse_name] = {
                "stat": {
                    "speed": int(stats["스피드"]),
                    "stamina": int(stats["스태미너"]),
                    "power": int(stats["파워"]),
                    "tough": int(stats["근성"]),
                    "intel": int(stats["지능"])
                },
                "grade": {
                    "더트": stats["마"],
                    "잔디": stats["장"],
                    **{k: stats[k] for k in headers[7:15]}
                },
                "running_style": {k: stats[k] for k in headers[15:]}
            }

    try:
        with open(json_file_path, 'r', encoding='utf-8') as json_file:
            existing_data = json.load(json_file)
    except FileNotFoundError:
        existing_data = {}

    existing_data[race_key] = data

    with open(json_file_path, 'w', encoding='utf-8') as json_file:
        json.dump(existing_data, json_file, ensure_ascii=False, indent=4)

    print("JSON file has been updated.")

convert_csv_to_json(csv_file_path, json_file_path)