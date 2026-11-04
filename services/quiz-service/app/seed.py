from .database import connect

QUIZZES = [(1,1,12,'First Steps Checkpoint'),(2,2,22,'Everyday English Checkpoint'),(3,3,32,'Workplace English Checkpoint')]
QUESTIONS = [
    (11,1,'single_choice','Choose the correct sentence.','a',1,1,[('a','I am Linh.'),('b','I is Linh.'),('c','I are Linh.')]),
    (12,1,'fill_blank','Complete: I am ___ Hanoi.','from',1,2,[]),
    (21,2,'single_choice','Choose the correct sentence.','b',1,1,[('a','She work every day.'),('b','She works every day.'),('c','She working every day.')]),
    (22,2,'fill_blank','Complete: We are ___ to visit a museum.','going',1,2,[]),
    (31,3,'single_choice','Choose a polite request.','c',1,1,[('a','You send the report now!'),('b','Report. Now.'),('c','Could you send the report?')]),
    (32,3,'fill_blank','Complete: Please ___ the meeting time.','confirm',1,2,[]),
]


def seed():
    with connect() as db:
        for row in QUIZZES:
            db.execute('INSERT INTO quizzes(id,course_id,lesson_id,title) VALUES (%s,%s,%s,%s) ON CONFLICT DO NOTHING', row)
        for identity,quiz,kind,prompt,correct,points,position,options in QUESTIONS:
            inserted = db.execute('''INSERT INTO questions(id,quiz_id,kind,prompt,correct_answer,points,position)
                                     VALUES (%s,%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING RETURNING id''',
                                 (identity,quiz,kind,prompt,correct,points,position)).fetchone()
            if inserted:
                for option,text in options:
                    db.execute('INSERT INTO answer_options(question_id,option_id,text) VALUES (%s,%s,%s)',(identity,option,text))
