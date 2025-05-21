# encode_worker.py
import sys
import json
import numpy as np
from sentence_transformers import SentenceTransformer
import torch

EMBED_MODEL = "BAAI/bge-m3"

device = "cuda" if torch.cuda.is_available() else "cpu"
model = SentenceTransformer(EMBED_MODEL, device=device)

with open(sys.argv[1], "r", encoding="utf-8") as f:
    texts = json.load(f)

embeddings = model.encode(texts, batch_size=16, normalize_embeddings=True)

with open(sys.argv[2], "w", encoding="utf-8") as f:
    json.dump(embeddings.tolist(), f)
