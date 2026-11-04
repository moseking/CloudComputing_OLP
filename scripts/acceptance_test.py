"""Real gateway acceptance tests. Run only against an explicit disposable local demo environment."""
import argparse
import json
from pathlib import Path
import secrets
from uuid import uuid4

import httpx


def env_values(path):
    values = {}
    for line in Path(path).read_text(encoding='utf-8').splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            key,value = line.split('=',1)
            values[key] = value.strip().strip('"').strip("'")
    return values


def run(base,env_file,output=None):
    config = env_values(env_file)
    if config.get('DEMO_MODE') != 'true':
        raise RuntimeError('Acceptance tests require the explicit DEMO_MODE=true environment.')
    checks = []
    with httpx.Client(base_url=base.rstrip('/'),timeout=15,follow_redirects=False,trust_env=False) as client:
        def request(method,path,expected=200,body=None,token=None,headers=None):
            merged = {**({'Authorization':'Bearer '+token} if token else {}),**(headers or {})}
            response = client.request(method,path,json=body,headers=merged)
            assert response.status_code == expected, f'{method} {path}: expected {expected}, got {response.status_code}'
            checks.append(f'{method} {path} -> {expected}')
            print('PASS',checks[-1],flush=True)
            return response.json() if 'application/json' in response.headers.get('content-type','') else response.text

        request('GET','/')
        request('GET','/health')
        for slug in ('users','courses','quizzes','payments'):
            health=request('GET',f'/services/{slug}/health')
            assert health['status']=='ok' and health['service']=={'users':'user','courses':'course','quizzes':'quiz','payments':'payment'}[slug]+'-service'
            assert request('GET',f'/services/{slug}/ready')['database']=='ready'
            request('GET',f'/services/{slug}/docs')
            schema = request('GET',f'/services/{slug}/openapi.json')
            assert schema['servers'][0]['url']==f'/services/{slug}'
        request('GET','/api/languages')
        courses = request('GET','/api/courses')['items']
        assert {row['level'] for row in courses} >= {'A1','A2','B1'}
        assert any(row['price']==0 for row in courses) and any(row['price']>0 for row in courses)
        assert all(row['language_code']=='en' for row in courses if row['id'] in (1,2,3))
        filtered = request('GET','/api/courses?level=A2')['items']
        assert filtered and all(row['level']=='A2' for row in filtered)
        request('GET','/api/courses?level=C2',422)
        request('GET','/api/courses/999999',404)
        assert len(request('GET','/api/courses/1/lessons')['items']) >= 2
        request('GET','/api/lessons/11',401)
        request('GET','/api/quizzes/1',401)
        request('GET','/api/users/me',401,token='tampered.jwt.value')

        email=f'acceptance-{uuid4().hex[:12]}@example.com'
        password=secrets.token_urlsafe(20)
        account={'email':email,'password':password,'display_name':'Acceptance Learner'}
        request('POST','/api/users/register',422,body={**account,'role':'admin'})
        registered=request('POST','/api/users/register',201,body=account)['user']
        assert registered['role']=='learner' and 'password_hash' not in registered
        request('POST','/api/users/register',409,body=account)
        request('POST','/api/users/login',401,body={'email':email,'password':'wrong-password'})
        auth=request('POST','/api/users/login',body={'email':email,'password':password})
        learner=auth['access_token']
        admin=request('POST','/api/users/login',body={'email':config['DEMO_ADMIN_EMAIL'],
                      'password':config['DEMO_ADMIN_PASSWORD']})['access_token']
        demo_learner=request('POST','/api/users/login',body={'email':config['DEMO_LEARNER_EMAIL'],
                             'password':config['DEMO_LEARNER_PASSWORD']})['access_token']
        assert request('GET','/api/users/me',token=demo_learner)['user']['role']=='learner'
        assert request('GET','/api/users/me',token=learner)['user']['id']==registered['id']
        profile={'display_name':'English Learner','bio':'Learning every day','self_assessed_level':'A1',
                 'language_preferences':[{'language_code':'en','level':'A1'}]}
        updated=request('PUT','/api/users/me',body=profile,token=learner)['user']
        assert updated['display_name']=='English Learner'
        request('PUT','/api/users/me',422,body={**profile,'role':'admin'},token=learner)

        request('GET','/api/lessons/11',403,token=learner)
        request('GET','/api/lessons/21',403,token=learner)
        request('GET','/api/quizzes/2',403,token=learner)
        request('POST','/api/enrollments',402,body={'course_id':2},token=learner)
        first=request('POST','/api/enrollments',201,body={'course_id':1},token=learner)['enrollment']
        replay=request('POST','/api/enrollments',201,body={'course_id':1},token=learner)['enrollment']
        assert first['id']==replay['id']
        lesson=request('GET','/api/lessons/11',token=learner)['lesson']
        assert all(key in lesson for key in ('theory','vocabulary','grammar','practice'))
        request('POST','/api/lessons/11/complete',token=learner)
        request('POST','/api/lessons/11/complete',token=learner)
        enrolled=request('GET','/api/enrollments/my-courses',token=learner)['items']
        free=next(row for row in enrolled if row['course_id']==1)
        assert free['completed_lessons']==1 and free['progress_percent']==50

        quiz=request('GET','/api/quizzes/1',token=learner)['quiz']
        assert 'correct_answer' not in json.dumps(quiz)
        request('POST','/api/quizzes/1/submit',422,body={'answers':{'11':'a','12':'from'},'score':999},token=learner)
        request('POST','/api/quizzes/1/submit',422,body={'answers':{'11':'a'}},token=learner)
        wrong=request('POST','/api/quizzes/1/submit',201,body={'answers':{'11':'b','12':'wrong'}},token=learner)
        assert wrong['attempt']['score']==0
        right=request('POST','/api/quizzes/1/submit',201,body={'answers':{'11':'a','12':' FROM '}},token=learner)
        assert right['attempt']['score']==right['attempt']['max_score']==2
        assert len(request('GET','/api/quizzes/1/results',token=learner)['items'])==2
        assert len(request('GET','/api/quizzes/my-results',token=learner)['items'])==2
        assert all(row['user_id'] != registered['id'] for row in request('GET','/api/quizzes/my-results',token=demo_learner)['items'])

        headers={'Idempotency-Key':str(uuid4())}
        request('POST','/api/payments',422,body={'course_id':2,'amount':1},token=learner,headers=headers)
        request('POST','/api/payments',422,body={'course_id':2,'card_number':'not-real'},token=learner,headers=headers)
        pending=request('POST','/api/payments',201,body={'course_id':2},token=learner,headers=headers)['transaction']
        assert pending['status']=='PENDING' and pending['amount']==149000
        payment_id=pending['id']
        again=request('POST','/api/payments',body={'course_id':2},token=learner,headers=headers)['transaction']
        assert again['id']==payment_id
        request('POST','/api/payments',409,body={'course_id':3},token=learner,headers=headers)
        request('GET',f'/api/payments/{payment_id}',403,token=demo_learner)
        request('POST',f'/api/payments/{payment_id}/simulate-result',403,body={'scenario':'success'},token=learner)
        failed=request('POST',f'/api/payments/{payment_id}/simulate-result',body={'scenario':'failure'},token=admin)['transaction']
        assert failed['status']=='FAILED' and not failed['enrollment_confirmed']
        request('GET','/api/lessons/21',403,token=learner)
        request('POST',f'/api/payments/{payment_id}/simulate-result',409,body={'scenario':'success'},token=admin)
        paid=request('POST','/api/payments',201,body={'course_id':2},token=learner,
                     headers={'Idempotency-Key':str(uuid4())})['transaction']
        paid_id=paid['id']
        success=request('POST',f'/api/payments/{paid_id}/simulate-result',body={'scenario':'success'},token=admin)['transaction']
        assert success['status']=='SUCCESS' and success['enrollment_confirmed']
        request('POST',f'/api/payments/{paid_id}/simulate-result',body={'scenario':'success'},token=admin)
        owned=request('GET','/api/enrollments/my-courses',token=learner)['items']
        assert len([row for row in owned if row['course_id']==2])==1
        request('GET','/api/lessons/21',token=learner)
        request('GET','/api/quizzes/2',token=learner)
        assert len(request('GET','/api/payments/my-transactions',token=learner)['items'])==2
        request('POST','/api/payments',409,body={'course_id':2},token=learner,headers={'Idempotency-Key':str(uuid4())})
        request('POST','/api/payments',400,body={'course_id':1},token=learner,headers={'Idempotency-Key':str(uuid4())})

        new_course={'language_code':'en','level':'C1','title':'Acceptance Advanced','description':'Original test content.','price':0}
        request('POST','/api/courses',403,body=new_course,token=learner)
        created=request('POST','/api/courses',201,body=new_course,token=admin)['course']
        assert created['id']>=100 and created['level']=='C1'
        new_lesson={'title':'A short argument','position':1,'theory':'State a claim and give a reason.',
                    'vocabulary':[],'grammar':[],'practice':[]}
        lesson_created=request('POST',f"/api/courses/{created['id']}/lessons",201,body=new_lesson,token=admin)['lesson']
        quiz_body={'course_id':created['id'],'lesson_id':lesson_created['id'],'title':'A new checkpoint',
                   'questions':[{'kind':'single_choice','prompt':'Choose a polite greeting.','options':[{'id':'a','text':'Hello'},{'id':'b','text':'Go away'}],'correct_answer':'a'},
                                {'kind':'fill_blank','prompt':'Complete: Good ___.','correct_answer':'morning'}]}
        request('POST','/api/quizzes',403,body=quiz_body,token=learner)
        new_quiz=request('POST','/api/quizzes',201,body=quiz_body,token=admin)['quiz']
        request('PUT',f"/api/lessons/{lesson_created['id']}",body={**new_lesson,'quiz_id':new_quiz['id']},token=admin)
        request('GET','/internal/courses/2/purchase',404)
        request('POST','/services/courses/internal/enrollments/confirm-payment',404,body={})
        request('GET','/api/not-found',404)
        request('GET','/services/courses/api/courses')

    result={'status':'passed','base_url':base,'checks':checks,'check_count':len(checks),
            'learner_id':registered['id'],'success_payment_id':paid_id,'failed_payment_id':payment_id,
            'quiz_attempt_id':right['attempt']['id']}
    if output:
        Path(output).write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'Acceptance: {len(checks)} HTTP checks passed. Credentials and JWTs were not logged.')
    return result


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--base-url',default='http://127.0.0.1:8080')
    parser.add_argument('--env-file',default='.env')
    parser.add_argument('--output')
    args=parser.parse_args()
    run(args.base_url,args.env_file,args.output)
