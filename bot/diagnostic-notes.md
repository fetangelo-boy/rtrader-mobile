# Bot Diagnostic Notes

## Website rtrader11.ru/club
- URL redirects to /login
- Shows "RTRADING CLUB - Закрытый трейдинг-клуб"
- Login form: "Email или никнейм" + "Пароль"
- Has "Зарегистрироваться" and "Забыли пароль?" links
- This is a SEPARATE website with its OWN auth system (not Supabase/RTrader app backend)

## Key observation
The website rtrader11.ru is a completely separate system from the RTrader mobile app.
The bot was REWRITTEN from scratch for the mobile app backend.
The old bot logic that served rtrader11.ru/club is GONE.

## Registration page rtrader11.ru/register
- Fields: Никнейм, Email, Пароль
- Checkboxes: Пользовательское соглашение, Политика конфиденциальности, Правила модерации
- Self-registration is available — users can register themselves
- This is a SEPARATE auth system from the mobile app

## Key question
- Does the OLD bot flow involve creating accounts on rtrader11.ru?
- Or does the bot just verify payment and the user registers themselves on the site?
- The current bot creates accounts on the MOBILE APP backend (Supabase), not on rtrader11.ru
