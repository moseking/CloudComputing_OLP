.PHONY: config up down logs ps test smoke
config:
	docker compose config --quiet
up:
	docker compose up --build -d --wait
down:
	docker compose down
logs:
	docker compose logs --tail=100 -f
ps:
	docker compose ps
test:
	python scripts/run_tests.py
smoke:
	python scripts/smoke_test.py
