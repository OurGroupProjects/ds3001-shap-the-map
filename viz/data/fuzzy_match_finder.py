import sys
import csv
from pprint import pprint
from fuzzywuzzy import process, fuzz

# File to start with
input_file = 'kaggle_fast-food.csv'

# Output version
out_version = '_v1'
# File to write to
output_file = 'location_name_matches'+ out_version +'.txt'

fuzzy_cuttof = 87

# Progress bar code take from https://gist.github.com/vladignatyev/06860ec2040cb497f0f3
def progress(count, total, status=''):
    bar_len = 60
    filled_len = int(round(bar_len * count / float(total)))

    percents = round(100.0 * count / float(total), 1)
    bar = '=' * filled_len + '-' * (bar_len - filled_len)

    sys.stdout.write('\r[%s] %s%s ...%s\r' % (bar, percents, '%', status))
    sys.stdout.flush()  

#***** Main code starts here *****#
raw_data = pd.read_csv(input_file)

all_names = raw_data['name'].value_counts().index.tolist()

matches = {}
len_names = len(all_names)
for i, name in enumerate(all_names):
    progress(i, len_names, status='Matching names')
    if not matches:
        matches[name] = []
        continue
    elif name in matches.keys():
        continue
    # Try matching to existing keys
    matched, ratio = process.extractOne(name, matches.keys())
    if ratio >= fuzzy_cutoff = 87

# Progress bar code take from https://gist.github.com/vladignatyev/06860ec2040cb497f0f3
def progress(count, total, status=''):
    bar_len = 60
    filled_len = int(round(bar_len * count / float(total)))

    percents = round(100.0 * count / float(total), 1)
    bar = '=' * filled_len + '-' * (bar_len - filled_len)

    sys.stdout.write('\r[%s] %s%s ...%s\r' % (bar, percents, '%', status))
    sys.stdout.flush()  

#***** Main code starts here *****#
raw_data = pd.read_csv(input_file)

all_names = raw_data['name'].value_counts().index.tolist()

matches = {}
len_names = len(all_names)
for i, name in enumerate(all_names):
    progress(i, len_names, status='Matching names')
    if not matches:
        matches[name] = []
        continue
    elif name in matches.keys():
        continue
    # Try matching to existing keys
    matched, ratio = process.extractOne(name, matches.keys())
    if ratio >= fuzzy_cutoff:
        matches[matched].append((name, ratio))
        continue
    # If no match, add to keys
    matches[name] = []

# pprint(chain_matches, open('chain_matches'+out_version+'.txt', 'w'))
pprint(matches, open(output_file, 'w'))
