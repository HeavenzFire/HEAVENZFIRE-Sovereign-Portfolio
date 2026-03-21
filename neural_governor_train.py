import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
import json
import sys

# --- NEURAL GOVERNOR ARCHITECTURE: PHOENIX v1.0 ---
# A Multi-Layer Perceptron designed to predict stability in Burgers Spectral Lattices.
class NeuralGovernor(nn.Module):
    def __init__(self, input_size=4, hidden_size=16, output_size=1):
        super(NeuralGovernor, self).__init__()
        self.mlp = nn.Sequential(
            nn.Linear(input_size, hidden_size),
            nn.ReLU(),
            nn.Linear(hidden_size, hidden_size // 2),
            nn.ReLU(),
            nn.Linear(hidden_size // 2, output_size),
            nn.Sigmoid()
        )

    def forward(self, x):
        return self.mlp(x)

def train_governor():
    # --- CRUCIBLE DATASET (Steps 1-10) ---
    # Features: [Energy, dE/dt, CFL_Advection, CFL_Diffusion]
    # Target: Stability (1 = Stable, 0 = Diverging)
    
    # Representative data from the Burgers Crucible
    X = np.array([
        [0.5381, -0.001, 0.12, 0.05], # Step 1: Stable
        [0.5370, -0.002, 0.15, 0.06], # Step 2: Stable
        [0.5355, -0.005, 0.22, 0.08], # Step 3: Warning
        [0.5320, -0.010, 0.35, 0.12], # Step 4: Critical
        [0.5280, -0.025, 0.48, 0.18], # Step 5: Diverging
        [0.5200, -0.050, 0.65, 0.25], # Step 6: Unstable
        [0.5100, -0.100, 0.85, 0.35], # Step 7: Exploding
        [0.5400, 0.000, 0.10, 0.04],  # Step 8: Reset Stable
        [0.5390, -0.001, 0.11, 0.04], # Step 9: Stable
        [0.5385, -0.002, 0.13, 0.05], # Step 10: Stable
    ], dtype=np.float32)
    
    y = np.array([1, 1, 1, 0.5, 0, 0, 0, 1, 1, 1], dtype=np.float32).reshape(-1, 1)

    # Convert to Tensors
    X_train = torch.from_numpy(X)
    y_train = torch.from_numpy(y)

    # Initialize Model, Loss, and Optimizer
    model = NeuralGovernor()
    criterion = nn.BCELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.01)

    # Training Loop
    epochs = 100
    loss_history = []

    for epoch in range(epochs):
        optimizer.zero_grad()
        outputs = model(X_train)
        loss = criterion(outputs, y_train)
        loss.backward()
        optimizer.step()
        
        loss_history.append(loss.item())
        
        if (epoch + 1) % 10 == 0:
            print(f"Epoch [{epoch+1}/{epochs}], Loss: {loss.item():.4f}")

    # Output loss history as JSON for the dashboard
    print("TRAINING_COMPLETE")
    print(json.dumps(loss_history))

    # Save the weights
    torch.save(model.state_dict(), "neural_governor_weights.pth")
    print("[SYSTEM] Governor weights saved to neural_governor_weights.pth")

if __name__ == "__main__":
    train_governor()
