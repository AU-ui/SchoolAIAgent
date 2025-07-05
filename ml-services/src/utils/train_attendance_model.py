import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
import joblib

# Generate synthetic attendance data
np.random.seed(42)
num_students = 200
num_days = 30

# Simulate attendance: 1 = present, 0 = absent
attendance_data = np.random.binomial(1, 0.95, size=(num_students, num_days))

# Introduce some anomalies (students with unusually low attendance)
anomaly_indices = np.random.choice(num_students, size=5, replace=False)
for idx in anomaly_indices:
    attendance_data[idx, np.random.choice(num_days, size=10, replace=False)] = 0

# Flatten for model (each row = student, features = attendance per day)
df = pd.DataFrame(attendance_data, columns=[f"day_{i+1}" for i in range(num_days)])

# Train IsolationForest for anomaly detection
model = IsolationForest(contamination=0.05, random_state=42)
model.fit(df)

# Save the model
joblib.dump(model, "attendance_anomaly_model.pkl")
print("Model trained and saved as attendance_anomaly_model.pkl") 