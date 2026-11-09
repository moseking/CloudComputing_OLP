import json
from pathlib import Path
"""Small original English lessons. Stable IDs link to independently owned quiz data."""
from psycopg.types.json import Jsonb
from .database import connect

COURSES = [
    (1,'en','A1','English First Steps','Chào hỏi, giới thiệu bản thân và làm quen tiếng Anh.',0,
     'Không cần kiến thức đầu vào.','Tự giới thiệu và trao đổi thông tin cơ bản.'),
    (2,'en','A2','Everyday English','Mô tả thói quen và giao tiếp trong sinh hoạt hằng ngày.',149000,
     'Đã làm quen từ vựng và câu đơn A1.','Nói về lịch trình, hoạt động và kế hoạch gần.'),
    (3,'en','B1','English at Work','Viết email và trao đổi lịch làm việc bằng tiếng Anh.',249000,
     'Có kiến thức câu cơ bản ở mức A2.','Viết email ngắn, đề xuất và xác nhận một cuộc hẹn.'),
]
LESSONS = [
    (11,1,'Hello and introductions',1,'Use a friendly greeting, then share your name. For example: Hello! I am Linh. Nice to meet you.',
     [{'term':'hello','ipa':'/həˈləʊ/','meaning':'xin chào','example':'Hello, my name is Linh.'},
      {'term':'name','ipa':'/neɪm/','meaning':'tên','example':'What is your name?'}],
     [{'pattern':'I am + name','explanation':'Dùng am với chủ ngữ I để giới thiệu.','examples':['I am Linh.','I am a learner.']}],
     [{'prompt':'Write two sentences to introduce yourself.','example':'Hello! I am Minh.'}],None),
    (12,1,'Where are you from?',2,'Ask about a place with Where. Answer with from and the name of a place: I am from Hanoi.',
     [{'term':'from','ipa':'/frɒm/','meaning':'từ, đến từ','example':'She is from Hue.'}],
     [{'pattern':'Where + be + subject + from?','explanation':'Câu hỏi về nơi xuất phát.','examples':['Where are you from?','Where is Mai from?']}],
     [{'prompt':'Ask a friend where they are from.','example':'Where are you from?'}],1),
    (21,2,'My daily routine',1,'Describe repeated activities using the present simple. I get up at seven. She starts work at eight.',
     [{'term':'routine','ipa':'/ruːˈtiːn/','meaning':'thói quen hằng ngày','example':'My morning routine starts at seven.'}],
     [{'pattern':'He/She + verb-s','explanation':'Thêm s hoặc es cho động từ với he/she ở hiện tại đơn.','examples':['She works at home.','He studies every day.']}],
     [{'prompt':'Describe three things you do every morning.','example':'I make breakfast. I read. I go to work.'}],None),
    (22,2,'Making plans',2,'Use be going to when talking about an intention. We are going to visit a museum this weekend.',
     [{'term':'weekend','ipa':'/ˌwiːkˈend/','meaning':'cuối tuần','example':'We meet at the weekend.'}],
     [{'pattern':'Subject + be going to + verb','explanation':'Nói về dự định đã có.','examples':['I am going to study tonight.','They are going to travel.']}],
     [{'prompt':'Write one plan for tonight and one for the weekend.','example':'I am going to read tonight.'}],2),
    (31,3,'A clear work email',1,'A short work email can have a greeting, a purpose, a clear request and a closing. Keep each sentence focused.',
     [{'term':'confirm','ipa':'/kənˈfɜːm/','meaning':'xác nhận','example':'Please confirm the time.'}],
     [{'pattern':'Could you + verb ...?','explanation':'Đưa ra yêu cầu lịch sự.','examples':['Could you send the report?','Could you confirm the date?']}],
     [{'prompt':'Write a short email to request a meeting time.','example':'Hello An, could you confirm our meeting time? Thank you.'}],None),
    (32,3,'Arranging a meeting',2,'Suggest a time and offer an alternative. If you are free on Friday, we can meet at ten.',
     [{'term':'available','ipa':'/əˈveɪləbl/','meaning':'có thời gian, sẵn sàng','example':'Are you available on Friday?'}],
     [{'pattern':'If + present simple, ... can + verb','explanation':'Đưa ra khả năng khi điều kiện phù hợp.','examples':['If you are free, we can meet.']}],
     [{'prompt':'Suggest a meeting and offer an alternative day.','example':'Could we meet on Friday? Monday also works for me.'}],3),
]


_content = json.loads(Path(__file__).with_name('learning_content.json').read_text(encoding='utf-8'))
COURSES.extend(_content['courses'])
LESSONS.extend(_content['lessons'])

def seed():
    with connect() as db:
        db.execute("INSERT INTO languages(code,name) VALUES ('en','English') ON CONFLICT DO NOTHING")
        for identity,language,level,title,description,price,prerequisites,goals in COURSES:
            db.execute('''INSERT INTO courses(id,language_code,level,title,description,price,prerequisites,learning_goals)
                          VALUES (%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING''',
                       (identity,language,level,title,description,price,prerequisites,goals))
        for identity,course,title,position,theory,vocabulary,grammar,practice,quiz in LESSONS:
            db.execute('''INSERT INTO lessons(id,course_id,title,position,theory,vocabulary,grammar,practice,quiz_id)
                          VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING''',
                       (identity,course,title,position,theory,Jsonb(vocabulary),Jsonb(grammar),Jsonb(practice),quiz))
