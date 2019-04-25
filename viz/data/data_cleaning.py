import sys
import csv
import json
import pandas as pd
from pprint import pprint
from fuzzywuzzy import process, fuzz

# File to start with
input_file = 'kaggle_fast-food.csv'

# Output version
out_version = '_v1'
# File to write to
output_file = 'fast-food_filtered'+ out_version +'.csv'

# What parts of the original csv to keep
columns = [
    'name',
    'city',
    'province',
    'postalCode',
    'latitude',
    'longitude',
]

# Progress bar code take from https://gist.github.com/vladignatyev/06860ec2040cb497f0f3
def progress(count, total, status=''):
    bar_len = 60
    filled_len = int(round(bar_len * count / float(total)))

    percents = round(100.0 * count / float(total), 1)
    bar = '=' * filled_len + '-' * (bar_len - filled_len)

    sys.stdout.write('\r[%s] %s%s ...%s\r' % (bar, percents, '%', status))
    sys.stdout.flush()

def clean_names(row):
    real_name = row['name']
    row['full_name'] = real_name
    if real_name in name_map_dict:
        row['name'] = name_map_dict[real_name]
    return row

#***** Main code starts here *****#
name_map_dict = eval(open('location_name_remapping.txt').read())

data = pd.read_csv(input_file)[columns].reset_index()
data = data.apply(clean_names, axis=1).drop('index', 1)
data.to_csv(output_file, index=False)
