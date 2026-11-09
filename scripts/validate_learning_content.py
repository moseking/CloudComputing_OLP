"""Validate authored demo content against existing schemas, grading and cross-service links."""
from pathlib import Path
import json
import subprocess
import sys

root=Path(__file__).resolve().parents[1]
course_code=r'''
import json
from app.seed import COURSES,LESSONS
from app.main import CourseRequest,LessonRequest
assert len({r[0] for r in COURSES})==len(COURSES), 'Duplicate course IDs'
assert len({r[0] for r in LESSONS})==len(LESSONS), 'Duplicate lesson IDs'
ids={r[0] for r in COURSES}
positions=set()
for row in COURSES:
    i,language,level,title,description,price,prerequisites,goals=row
    CourseRequest(language_code=language,level=level,title=title,description=description,price=price,prerequisites=prerequisites,learning_goals=goals)
for row in LESSONS:
    i,course,title,position,theory,words,grammar,practice,quiz=row
    assert course in ids and (course,position) not in positions
    positions.add((course,position))
    LessonRequest(title=title,position=position,theory=theory,vocabulary=words,grammar=grammar,practice=practice,quiz_id=quiz)
new_courses=[r for r in COURSES if 4<=r[0]<=8]
assert {r[2] for r in new_courses}=={'A1','A2','B1','B2','C1'}
for course in new_courses:
    rows=[r for r in LESSONS if r[1]==course[0]]
    assert len(rows)==3 and {r[3] for r in rows}=={1,2,3}
    assert all('## Reading\n' in r[4] and '## Nguồn tham khảo\n' in r[4] and len(r[5])==6 and len(r[6])>=2 and len(r[7])>=2 for r in rows)
print(json.dumps({'courses':len(COURSES),'lessons':len(LESSONS),'new_courses':len(new_courses),'lesson_links':[[r[0],r[1],r[8]] for r in LESSONS]}))
'''
quiz_code=r'''
import json
from app.seed import QUIZZES,QUESTIONS
from app.main import QuizRequest
from app.grading import grade
assert len({r[0] for r in QUIZZES})==len(QUIZZES)
assert len({r[0] for r in QUESTIONS})==len(QUESTIONS)
for identity,course,lesson,title in QUIZZES:
    rows=[r for r in QUESTIONS if r[1]==identity]
    assert len({r[6] for r in rows})==len(rows)
    items=[dict(id=r[0],kind=r[2],prompt=r[3],correct_answer=r[4],points=r[5],options=[{'id':i,'text':t} for i,t in r[7]]) for r in rows]
    QuizRequest(course_id=course,lesson_id=lesson,title=title,questions=[{k:v for k,v in q.items() if k!='id'} for q in items])
    result=grade(items,{str(q['id']):q['correct_answer'] for q in items})
    assert result['score']==result['max_score']==sum(q['points'] for q in items)
    assert result['correct_count']==len(items)
    if 4<=identity<=8:
        assert len(rows)==10 and {r[2] for r in rows}=={'single_choice','fill_blank'}
        wrong={str(q['id']):(next(o['id'] for o in q['options'] if o['id']!=q['correct_answer']) if q['kind']=='single_choice' else '__wrong__') for q in items}
        assert grade(items,wrong)['score']==0
print(json.dumps({'quizzes':len(QUIZZES),'questions':len(QUESTIONS),'quiz_links':[[r[0],r[1],r[2]] for r in QUIZZES]}))
'''
def inspect(service,code):
    result=subprocess.run([sys.executable,'-c',code],cwd=root/'services'/f'{service}-service',capture_output=True,text=True,encoding='utf-8')
    if result.returncode:
        print(result.stderr)
        raise SystemExit(result.returncode)
    return json.loads(result.stdout)
course=inspect('course',course_code)
quiz=inspect('quiz',quiz_code)
lessons={row[0]:(row[1],row[2]) for row in course['lesson_links']}
quizzes={row[0]:(row[1],row[2]) for row in quiz['quiz_links']}
for identity,(course_id,quiz_id) in lessons.items():
    if quiz_id is not None:
        assert quizzes[quiz_id]==(course_id,identity), f'Cross-service mismatch for lesson {identity}'
result={key:value for group in (course,quiz) for key,value in group.items() if not key.endswith('_links')}
print('Demo content validated: '+json.dumps(result))
