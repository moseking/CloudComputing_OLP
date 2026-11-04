"""Read-only smoke test for a running OELP gateway; does not create accounts or transactions."""
import argparse
from urllib.error import HTTPError
from urllib.request import Request, urlopen
import json


def run(base):
    count = 0
    def check(path,expected=200):
        nonlocal count
        request = Request(base.rstrip('/')+path)
        try:
            response = urlopen(request,timeout=10)
        except HTTPError as error:
            response = error
        with response:
            body = response.read().decode()
            assert response.status==expected, f'{path}: expected {expected}, got {response.status}'
            count += 1
            print(f'PASS GET {path} -> {expected}')
            return json.loads(body) if 'application/json' in response.headers.get('Content-Type','') else body
    assert '<div id="root">' in check('/')
    check('/health')
    for slug in ('users','courses','quizzes','payments'):
        check(f'/services/{slug}/health')
        assert check(f'/services/{slug}/ready')['database']=='ready'
        check(f'/services/{slug}/docs')
        assert check(f'/services/{slug}/openapi.json')['servers'][0]['url']==f'/services/{slug}'
    assert check('/api/languages')['items']
    assert check('/api/courses')['total']>=3
    assert all(row['level']=='A1' for row in check('/api/courses?level=A1')['items'])
    check('/api/lessons/11',401)
    check('/api/quizzes/1',401)
    check('/api/payments/my-transactions',401)
    check('/api/not-found',404)
    check('/services/courses/internal/courses/1/purchase',404)
    print(f'Smoke test: {count} checks passed')


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--base-url',default='http://127.0.0.1:8080')
    run(parser.parse_args().base_url)
