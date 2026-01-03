# This file suppresses MKL warnings when placed in the Python path
import os
import warnings

# Suppress Intel MKL warnings
os.environ['MKL_SERVICE_FORCE_INTEL'] = '1'
os.environ['MKL_THREADING_LAYER'] = 'sequential'
os.environ['KMP_WARNINGS'] = '0'

# Suppress all warnings
warnings.filterwarnings('ignore')

