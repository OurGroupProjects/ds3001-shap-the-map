import pandas as pd
from pprint import pprint
import json

# File to start with
input_file = 'kaggle_fast-food.csv'

# Output version
out_version = '_v1'
# File to write to
output_file = 'counts-by-state'+ out_version +'.json'

count_n = 3

raw_data = pd.read_csv(input_file)

counts_by_state = raw_data.groupby('province')['name'].value_counts()
totals_by_state = raw_data.groupby('province')['name'].count()

states = counts_by_state.index.get_level_values('province').unique().tolist()

state_count_dict = {}
for state in states:
    topn = list(counts_by_state[state][:count_n].items())
    top_str = 'top-'+str(count_n)
    state_count_dict[state] = {
        top_str: [],
        'total': int(totals_by_state[state])
    }
    state_count_dict[state][top_str] = [{key:value} for key,value in topn]
    
json.dump(state_count_dict, open(output_file, 'w'), indent=2)
