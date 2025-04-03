# Polaris AI Studio with Hugging Face Integration

This project enhances the Polaris AI Studio with real-time data from Hugging Face, providing users with up-to-date information about AI models.

## Features

- **Real-time Model Data**: Fetches the latest statistics from Hugging Face API including downloads, likes, and last updated date
- **Model Repository Links**: Direct links to model repositories and model cards on Hugging Face
- **Hardware Compatibility Analysis**: Displays detailed hardware requirements for each model
- **Fallback Mechanism**: Uses mock data when API is unavailable or for models without Hugging Face IDs
- **Enhanced UI**: Beautiful and responsive interface for browsing and selecting models

## Implementation Details

### Components

1. **ModelLoaderHOC**: Higher Order Component that loads models from models.json and enhances them with Hugging Face data
2. **EnhancedAIStudio**: Wrapper component that formats the enhanced models for AIStudio
3. **HardwareCompatibility**: Component that displays hardware requirements and compatibility analysis
4. **ModelSelector**: Component for browsing and selecting models with filtering and search capabilities

### Utilities

1. **huggingfaceUtils.js**: Utility functions for fetching and handling data from Hugging Face
   - `getHuggingFaceRepoUrl`: Returns the URL to the Hugging Face model repository
   - `getHuggingFaceModelCardUrl`: Returns the URL to the model card
   - `fetchModelDataFromHuggingFace`: Fetches model data from the Hugging Face API
   - `formatDownloadCount`: Formats download counts in a readable format
   - `formatLastUpdated`: Formats last updated dates in a human-readable format
   - `loadModelsWithHuggingFaceData`: Loads models from models.json and enhances them with Hugging Face data

## Getting Started

1. Place your models.json file in the public folder
2. Use the EnhancedAIStudio component instead of AIStudio
3. The component will automatically load models from models.json and enhance them with Hugging Face data

## Example Usage

```jsx
import { EnhancedAIStudio } from './screens';

function App() {
  return (
    <div className="App">
      <EnhancedAIStudio darkMode={true} />
    </div>
  );
}
```

## Data Format

The models.json file should contain an array of model objects with the following structure:

```json
{
  "models": [
    {
      "id": "model-id",
      "name": "Model Name",
      "description": "Model description",
      "parameters": "7B",
      "huggingface_id": "organization/model-id",
      "type": "base",
      "brand": "Brand",
      "size": "14.2 GB",
      "requirements": {
        "cpu": {
          "minCores": 4,
          "recommended": 8,
          "minRam": "16 GB"
        },
        "gpu": {
          "required": true,
          "minVram": "8 GB",
          "recommendedVram": "16 GB",
          "recommendedType": "NVIDIA T4 or better"
        },
        "storage": "20 GB",
        "contextLength": "8192 tokens"
      },
      "quantizations": ["int8", "int4", "GPTQ"]
    }
  ]
}
```
