# users/forms.py
from django import forms
from django.contrib.auth.models import User
from django.contrib.auth.forms import UserCreationForm
from .models import UserProfile, SPORT_CLASS_CHOICES
from captcha.fields import CaptchaField, CaptchaTextInput

class CustomCaptchaTextInput(CaptchaTextInput):
    template_name = 'captcha/widgets/captcha.html'

class SignUpForm(UserCreationForm):
    email = forms.EmailField(required=True, label='Электронная почта')
    first_name = forms.CharField(max_length=30, required=True, label='Имя')
    last_name = forms.CharField(max_length=30, required=True, label='Фамилия')

    GENDER_CHOICES = [
        ('male', 'Мужской'),
        ('female', 'Женский'),
    ]
    gender = forms.ChoiceField(choices=GENDER_CHOICES, widget=forms.RadioSelect, required=True, label='Пол')

    sport_class = forms.ChoiceField(
        choices=SPORT_CLASS_CHOICES,
        widget=forms.RadioSelect,
        required=True,
        label='Класс'
    )

    ROLE_CHOICES = [
        ('athlete', 'Спортсмен'),
        ('organizer', 'Организатор'),
    ]
    role = forms.ChoiceField(
        choices=[('athlete', 'Спортсмен'), ('organizer', 'Организатор')],
        widget=forms.RadioSelect,
        required=True,
        label='Роль'
    )
    captcha = CaptchaField(widget=CustomCaptchaTextInput)

    agree_to_terms = forms.BooleanField(required=True, label='Я согласен с условиями обработки персональных данных')

    class Meta:
        model = User
        fields = ('username', 'email', 'first_name', 'last_name', 'password1', 'password2')

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if User.objects.filter(email=email).exists():
            raise forms.ValidationError('Пользователь с таким email уже существует')
        return email

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['captcha'].widget.attrs.update({'class': 'input'})