import pandas as pd
from res_ind_lib import compute_resilience_from_packed_inputs

if __name__ == '__main__':
    df = pd.read_csv('df_for_wrapper.csv', index_col=0)
    output = compute_resilience_from_packed_inputs(df)
    output.to_csv('out.csv')
