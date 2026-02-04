import os
import sys
import json
import joblib
import argparse
import pandas as pd
import numpy as np
from typing import Dict, List
from xgboost import XGBClassifier


class MatchPredictor:
	"""Preditor universal que carrega modelos das pastas `models` ou `train`."""

	def __init__(self, models_dir: str = None, version: str = None):
		THIS_DIR = os.path.dirname(os.path.abspath(__file__))
		# localizar pasta de modelos (prefer train, depois models)
		candidates = []
		if models_dir:
			candidates.append(models_dir)
		candidates.append(os.path.join(THIS_DIR, "train"))
		candidates.append(os.path.join(THIS_DIR, "models"))

		self.models_dir = None
		for c in candidates:
			if os.path.isdir(c):
				self.models_dir = c
				break

		if self.models_dir is None:
			raise FileNotFoundError("Nenhuma pasta de modelos encontrada (train/ or models/)")

		# Detectar versão disponível
		avail = os.listdir(self.models_dir)
		if version and f"xgb_1x2_{version}.json" in avail:
			self.version = version
		else:
			# preferir v4, v3, v2, v1
			self.version = None
			for v in ["v4", "v3", "v2", ""]:
				name = f"xgb_1x2_{v}.json" if v else "xgb_1x2.json"
				if name in avail:
					self.version = v if v else "v1"
					break

		if self.version is None:
			raise FileNotFoundError("Nenhum modelo xgb_1x2 encontrado na pasta de modelos")

		# paths
		if self.version == "v1":
			model_file = "xgb_1x2.json"
			cols_file = "xgb_1x2_columns.pkl"
			scaler_file = None
			meta_file = "xgb_1x2_meta.json"
		else:
			model_file = f"xgb_1x2_{self.version}.json"
			cols_file = f"xgb_1x2_{self.version}_columns.pkl"
			scaler_file = f"xgb_1x2_{self.version}_scaler.pkl"
			meta_file = f"xgb_1x2_{self.version}_meta.json"

		self.model_path = os.path.join(self.models_dir, model_file)
		self.cols_path = os.path.join(self.models_dir, cols_file)
		self.scaler_path = os.path.join(self.models_dir, scaler_file) if scaler_file else None
		self.meta_path = os.path.join(self.models_dir, meta_file)

		self._load_model()

	def _load_model(self):
		if not os.path.exists(self.model_path):
			raise FileNotFoundError(f"Modelo não encontrado: {self.model_path}")

		self.model = XGBClassifier()
		self.model.load_model(self.model_path)

		# carregar colunas
		if os.path.exists(self.cols_path):
			self.columns = joblib.load(self.cols_path)
		else:
			self.columns = None

		# scaler opcional
		if self.scaler_path and os.path.exists(self.scaler_path):
			self.scaler = joblib.load(self.scaler_path)
		else:
			self.scaler = None

		# metadata
		if os.path.exists(self.meta_path):
			with open(self.meta_path, "r", encoding="utf-8") as f:
				self.meta = json.load(f)
		else:
			self.meta = {}

		# assume todas as colunas conhecidas são numéricas por padrão
		if self.columns is not None:
			self.num_cols = list(self.columns)
			self.cat_cols = []
		else:
			self.num_cols = self.meta.get("num_cols", [])
			self.cat_cols = self.meta.get("cat_cols", [])

	def _prepare_X(self, match_data: Dict) -> pd.DataFrame:
		df = pd.DataFrame([match_data])
		# preencher numericas
		X_num = df.reindex(columns=self.num_cols).fillna(0) if self.num_cols else df.fillna(0)

		# categoricas -> one-hot se existirem
		if self.cat_cols:
			X_cat = pd.get_dummies(df[self.cat_cols].astype(str), prefix=self.cat_cols, dummy_na=False)
			X = pd.concat([X_num, X_cat], axis=1)
		else:
			X = X_num

		if self.columns is not None:
			X = X.reindex(columns=self.columns, fill_value=0)

		if self.scaler is not None and len(self.num_cols) > 0:
			X[self.num_cols] = self.scaler.transform(X[self.num_cols])

		return X

	def predict(self, match_data: Dict) -> Dict:
		X = self._prepare_X(match_data)
		proba = self.model.predict_proba(X)[0]
		pred = int(np.argmax(proba))
		pred_map = {0: "1", 1: "X", 2: "2"}
		return {
			"prediction": pred_map[pred],
			"confidence": float(proba[pred]),
			"probabilities": {
				"home": float(proba[0]),
				"draw": float(proba[1]),
				"away": float(proba[2]),
			},
			"model_version": self.version,
		}

	def predict_batch(self, matches: List[Dict]) -> List[Dict]:
		return [self.predict(m) for m in matches]

	def get_model_info(self) -> Dict:
		return {
			"version": self.version,
			"meta": self.meta,
		}


def main():
	parser = argparse.ArgumentParser()
	parser.add_argument("--info", action="store_true", help="Print model info as JSON")
	parser.add_argument("--predict", action="store_true", help="Read JSON from stdin and predict")
	parser.add_argument("--version", type=str, help="Force model version (v2,v3,v4)")
	args = parser.parse_args()

	predictor = MatchPredictor(version=args.version)

	if args.info:
		print(json.dumps(predictor.get_model_info(), ensure_ascii=False))
		return

	if args.predict:
		raw = sys.stdin.read()
		try:
			payload = json.loads(raw)
		except Exception:
			print(json.dumps({"error": "Invalid JSON input"}))
			return

		# accept single match or batch
		if isinstance(payload, dict) and payload.get("matches"):
			matches = payload["matches"]
			out = predictor.predict_batch(matches)
			print(json.dumps(out, ensure_ascii=False))
			return

		if isinstance(payload, dict):
			out = predictor.predict(payload)
			print(json.dumps(out, ensure_ascii=False))
			return

		print(json.dumps({"error": "Unexpected input format"}))


if __name__ == "__main__":
	main()
