import sys
import csv
import json
from pprint import pprint
from fuzzywuzzy import process, fuzz

# Json file to start with
json_file = 'business.json'

# Output version
out_version = '_v2'
# CSV file to write to
csv_file = 'business'+ out_version +'.csv'

# What parts of the json to keep
columns = [
    'business_id',
    'name',
    'city',
    'state',
    'postal_code',
    'latitude',
    'longitude',
]

# Chains we are looking at
chains = ["McDonalds","Burger King","Wendy's","Chick Fil A","Five Guys","Arby's","Taco Bell",
          "Dairy Queen","KFC","Quiznos","Subway","Panera Bread","Popeyes","Taco del mar",
          "Chipotle","Wings over","A&W","White Castle","Sonic","QDOBA Mexican Eats","D'Angelos",
          "T-N-T Fast Food","Pollo Tropical","Checkers","Shake Shack","Tossed","Miami Subs Grill",
          "Church's Chicken","Steak 'n Shake","Pita Pit","Jersey Mike's Subs",
          "Zaxby's Chicken Fingers & Buffalo Wings","Hardee's","RaceTrac","Firehouse Subs",
          "Jimmy Johns","Krystal","Captain D's","Jack's","Del Taco","Ward's Restaurant",
          "Chicken Express","Jack in the Box","Panda Express","Indi's Fast Food","Carl's Jr",
          "Wienerschnitzel","Arctic Circle","Taco John's","Culver's","Long John Silver's",
          "Good Times Burgers & Frozen Custard","Roy Rogers","Teddy's Bigger Burgers"
]

fuzzy_cutoff = 90
use_fuzzy = True
min_len_for_fuzzy = 5
chains_found = {key: 0 for key in chains}
chain_fuzzy_matches = {key: set() for key in chains}

# Retrieve relevent attributes from json entry
def parse_entry(entry):
    row = []
    for col in columns:
        if col not in entry or entry[col] is None or entry[col] == '':
            row.append('')
            if not col == 'postal_code':
                    print('error with entry: {} in {}, missing {}'.format(entry['name'], entry['city'], col))
        else:
            row.append(entry[col])
    return row

# Decide if we will use the entry (is a relevent food chain)
def filter_entry(entry):
    name = entry['name']
    if 'categories' not in entry or entry['categories'] is None \
       or 'Restaurant' not in entry['categories']:
        return False
    if name in chains:
        chains_found[name]+=1
        return True
    elif use_fuzzy and len(name) >= min_len_for_fuzzy:
        chain_name, ratio = process.extractOne(name, chains, scorer=fuzz.partial_ratio)
        if ratio > fuzzy_cutoff and len(chain_name) >= min_len_for_fuzzy:
            # print("Similarity of {} between {} and {}".format(ratio, name, chain_name))
            chain_fuzzy_matches[chain_name].add(name)
            chains_found[chain_name]+=1
            return True
    return False

# Progress bar code take from https://gist.github.com/vladignatyev/06860ec2040cb497f0f3
def progress(count, total, status=''):
    bar_len = 60
    filled_len = int(round(bar_len * count / float(total)))

    percents = round(100.0 * count / float(total), 1)
    bar = '=' * filled_len + '-' * (bar_len - filled_len)

    sys.stdout.write('\r[%s] %s%s ...%s\r' % (bar, percents, '%', status))
    sys.stdout.flush()  


with open(csv_file, 'w+', encoding='UTF8', newline='') as fout:
    csv_out = csv.writer(fout)
    csv_out.writerow(columns)
    total_lines = sum(1 for line in open(json_file, encoding='UTF8'))
    with open(json_file, encoding='UTF8') as fin:
        for i, line in enumerate(fin):
            progress(i, total_lines, status='Parsing business.json')
            entry = json.loads(line)
            if filter_entry(entry):
                row = parse_entry(entry)
                csv_out.writerow(row)

pprint(chains_found, open('chains_found' + out_version + '.txt', 'w'))
pprint(chain_fuzzy_matches, open('chain_fuzzy_matches' + out_version + '.txt', 'w'))
