"""Pure backend grading; no client-supplied scores or correct answers are trusted."""
import unicodedata


def normalize_answer(value):
    return ' '.join(unicodedata.normalize('NFKC', value).casefold().split())


def grade(questions, answers):
    required = {str(q['id']) for q in questions}
    if set(answers) != required:
        raise ValueError('Cần nộp đúng một câu trả lời cho từng câu hỏi của bài kiểm tra.')
    review = []
    for question in questions:
        answer = answers[str(question['id'])]
        correct = question['correct_answer']
        if question['kind'] == 'single_choice':
            if answer not in {option['id'] for option in question['options']}:
                raise ValueError('Đáp án trắc nghiệm không thuộc các lựa chọn của câu hỏi.')
            is_correct = answer == correct
        else:
            is_correct = normalize_answer(answer) == normalize_answer(correct)
        review.append({'question_id':question['id'],'submitted_answer':answer,'correct_answer':correct,
                       'is_correct':is_correct,'awarded_points':question['points'] if is_correct else 0})
    return {'score':sum(row['awarded_points'] for row in review),
            'max_score':sum(q['points'] for q in questions),
            'correct_count':sum(row['is_correct'] for row in review),'answers':review}
