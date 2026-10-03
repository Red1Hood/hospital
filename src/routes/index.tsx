import { createFileRoute, Link } from "@tanstack/react-router";
import {
  UserPlus,
  Stethoscope,
  CalendarClock,
  ClipboardList,
  FolderHeart,
  FlaskConical,
  BedDouble,
  BarChart3,
  ArrowRight,
  ShieldCheck,
  Zap,
  FileCheck,
} from "lucide-react";
import doctorImage from "@/assets/doctor.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "АИС «Больница» — автоматизация медицинского учреждения" },
      {
        name: "description",
        content:
          "Автоматизированная информационная система больницы: регистрация пациентов, запись на приём, электронные медицинские карты, госпитализация, лаборатория и отчётность — в одной платформе.",
      },
      { property: "og:title", content: "АИС «Больница» — автоматизация медицинского учреждения" },
      {
        property: "og:description",
        content:
          "Регистрация пациентов, расписание врачей, электронные медкарты, госпитализация и отчётность — единая цифровая платформа больницы.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const functions = [
  {
    icon: UserPlus,
    title: "Регистрация пациентов",
    text: "Электронная карточка пациента (Ф.И.О., ИИН, дата рождения, контакты) при первом обращении.",
  },
  {
    icon: Stethoscope,
    title: "Справочник врачей и отделений",
    text: "Данные о врачах — специальность, отделение, кабинет, график — и структура отделений больницы.",
  },
  {
    icon: CalendarClock,
    title: "Расписание и запись на приём",
    text: "Выбор специальности, врача, даты и времени с автоматической проверкой занятости слота.",
  },
  {
    icon: ClipboardList,
    title: "Ведение приёма пациента",
    text: "Фиксация врачом жалоб, результатов осмотра, назначений и рекомендаций по итогам приёма.",
  },
  {
    icon: FolderHeart,
    title: "Электронная медицинская карта",
    text: "Полная история обращений: приёмы, госпитализации, обследования и результаты анализов.",
  },
  {
    icon: FlaskConical,
    title: "Направления и лаборатория",
    text: "Направления на обследование и регистрация результатов лабораторных исследований.",
  },
  {
    icon: BedDouble,
    title: "Госпитализация и койко-места",
    text: "Учёт поступления и выписки, распределение по палатам с контролем занятости коек.",
  },
  {
    icon: BarChart3,
    title: "Административная отчётность",
    text: "Отчёты по числу приёмов, госпитализаций, занятости койко-мест и нагрузке врачей.",
  },
];

const roles = [
  { letter: "Р", name: "Регистратор", desc: "Регистрация пациентов и запись на приём" },
  { letter: "В", name: "Врач", desc: "Приёмы и ведение записей" },
  { letter: "М", name: "Медсестра", desc: "Работа с медицинской информацией" },
  { letter: "Л", name: "Лаборант", desc: "Внесение результатов исследований" },
  { letter: "А", name: "Администратор", desc: "Управление системой и пользователями" },
  { letter: "Р", name: "Руководитель", desc: "Статистика и отчётность" },
  { letter: "П", name: "Пациент", desc: "Личный кабинет: записи и расписание" },
];

const advantages = [
  {
    icon: Zap,
    title: "Меньше ручной работы",
    text: "Данные вводятся один раз и доступны всем уполномоченным сотрудникам — без бумажных дубликатов.",
  },
  {
    icon: FileCheck,
    title: "Полный цикл обслуживания",
    text: "От регистрации и записи на приём до медкарты, обследований, госпитализации и выписки.",
  },
  {
    icon: ShieldCheck,
    title: "Безопасность и роли",
    text: "Разграничение прав по ролям, хэширование паролей и принцип минимально необходимого доступа.",
  },
];

function Index() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-[#eaf1ff] via-mist to-[#e6f6fb] font-body text-ink">
      {/* ambient blobs */}
      <div className="pointer-events-none absolute -top-24 -left-16 size-72 rounded-full bg-brand/25 blur-3xl animate-floaty" />
      <div className="pointer-events-none absolute top-40 -right-20 size-64 rounded-full bg-aqua/25 blur-3xl animate-floaty2" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 size-56 rounded-full bg-brand-deep/15 blur-3xl animate-floaty" />

      {/* header */}
      <header className="relative z-10 mx-auto max-w-6xl px-5 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid size-10 place-items-center rounded-xl glass shadow-lg shadow-brand/10">
              <span className="font-display text-lg font-bold text-brand">+</span>
            </div>
            <div className="leading-none">
              <p className="font-display text-[15px] font-bold tracking-tight">
                Больница<span className="text-brand">.АИС</span>
              </p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Медицинская информационная система
              </p>
            </div>
          </div>
          <Link
            to="/auth"
            className="rounded-full glass px-4 py-2 text-[13px] font-semibold text-brand-deep shadow-md shadow-brand/10 transition-transform hover:scale-105"
          >
            Войти в систему
          </Link>
        </div>
      </header>

      {/* hero */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 pt-10">
        <div className="grid items-center gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl glass shadow-xl shadow-brand/10 p-6 sm:p-10">
            <span className="inline-block rounded-full bg-brand/10 px-3 py-1 text-[11px] font-semibold text-brand-deep">
              Автоматизированная информационная система
            </span>
            <h1 className="mt-4 font-display text-3xl sm:text-5xl font-bold leading-[1.05] tracking-tight text-balance">
              Единая цифровая платформа для всей больницы
            </h1>
            <p className="mt-4 text-sm sm:text-base leading-relaxed text-muted-foreground text-pretty max-w-[52ch]">
              АИС «Больница» охватывает полный цикл обслуживания пациента: от регистрации и записи на
              приём до электронной медицинской карты, обследований, госпитализации и отчётности для
              руководства.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <a
                href="#functions"
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-brand/30 transition-transform hover:scale-105"
              >
                Функции системы
                <ArrowRight className="size-4" />
              </a>
              <a
                href="#roles"
                className="inline-flex items-center rounded-xl glass px-5 py-3.5 text-sm font-semibold text-brand-deep transition-transform hover:scale-105"
              >
                Роли пользователей
              </a>
            </div>
          </div>

          <div className="rounded-3xl glass shadow-xl shadow-brand/10 p-4">
            <img
              src={doctorImage}
              alt="Врач АИС «Больница»"
              width={816}
              height={816}
              className="w-full rounded-2xl object-cover aspect-square"
            />
            <div className="mt-4 flex items-center justify-between px-1 pb-1">
              <div>
                <p className="text-[11px] uppercase tracking-[0.15em] text-brand">Личный кабинет пациента</p>
                <p className="font-display text-base font-bold leading-tight">Записи и расписание — онлайн</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* stats */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 mt-6">
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: "8", label: "модулей системы" },
            { value: "7", label: "ролей пользователей" },
            { value: "24/7", label: "доступ к данным" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl glass-soft p-4 text-center">
              <p className="font-display text-2xl sm:text-3xl font-bold text-brand-deep">{s.value}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* functions */}
      <section id="functions" className="relative z-10 mx-auto max-w-6xl px-5 mt-14 scroll-mt-8">
        <div className="flex items-end justify-between mb-5">
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Функции системы</h2>
          <span className="text-xs font-semibold text-brand">8 модулей</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {functions.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl glass-soft p-5 shadow-md shadow-brand/5 transition-transform hover:-translate-y-1"
            >
              <div className="grid size-11 place-items-center rounded-xl bg-brand/10 text-brand">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-3 font-display text-[15px] font-semibold leading-snug">{f.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* roles */}
      <section id="roles" className="relative z-10 mx-auto max-w-6xl px-5 mt-14 scroll-mt-8">
        <div className="flex items-end justify-between mb-5">
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Роли пользователей</h2>
          <span className="text-xs font-semibold text-brand">Доступ по ролям</span>
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {roles.map((r, i) => (
            <div key={i} className="rounded-2xl glass-soft p-4 shadow-md shadow-brand/5">
              <div className="grid size-9 place-items-center rounded-xl bg-brand/10 text-brand-deep font-display text-sm font-bold">
                {r.letter}
              </div>
              <p className="mt-3 text-sm font-semibold">{r.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{r.desc}</p>
            </div>
          ))}
          <div className="rounded-2xl glass-soft p-4 shadow-md shadow-brand/5 flex flex-col justify-center">
            <p className="text-sm font-semibold text-brand-deep">Принцип минимального доступа</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Каждая роль видит только свои функции
            </p>
          </div>
        </div>
      </section>

      {/* advantages */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 mt-14">
        <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-5">
          Преимущества автоматизации
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          {advantages.map((a) => (
            <div key={a.title} className="rounded-3xl glass p-6 shadow-xl shadow-brand/10">
              <div className="grid size-11 place-items-center rounded-xl bg-aqua/15 text-aqua">
                <a.icon className="size-5" />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold">{a.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="relative z-10 mx-auto max-w-6xl px-5 mt-14 scroll-mt-8">
        <div className="rounded-3xl bg-brand-deep p-6 sm:p-10 shadow-xl shadow-brand/20 relative overflow-hidden">
          <div className="pointer-events-none absolute -top-16 -right-16 size-64 rounded-full bg-aqua/25 blur-3xl" />
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-primary-foreground text-balance max-w-[24ch]">
            Готовы автоматизировать свою больницу?
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-primary-foreground/75 text-pretty max-w-[48ch]">
            Система рассчитана на больницы амбулаторно-стационарного типа: регистратура, врачи,
            лаборатория, стационар и руководство — в одном контуре.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="mailto:info@bolnitsa-ais.ru"
              className="inline-flex items-center gap-2 rounded-xl bg-primary-foreground px-5 py-3 text-sm font-semibold text-brand-deep transition-transform hover:scale-105"
            >
              Оставить заявку
              <ArrowRight className="size-4" />
            </a>
            <a
              href="#functions"
              className="inline-flex items-center rounded-xl bg-primary-foreground/10 px-5 py-3 text-sm font-medium text-primary-foreground ring-1 ring-primary-foreground/20 transition-transform hover:scale-105"
            >
              Посмотреть функции
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-2 text-xs text-primary-foreground/70">
            <span>+7 (495) 000-00-00</span>
            <span>info@bolnitsa-ais.ru</span>
            <span>Веб-доступ с любого устройства</span>
          </div>
        </div>
      </section>

      <footer className="relative z-10 mx-auto max-w-6xl px-5 py-10">
        <p className="text-xs text-muted-foreground">
          АИС «Больница» — автоматизированная информационная система медицинского учреждения. Контакты на
          странице указаны как пример — замените их на реальные.
        </p>
      </footer>
    </div>
  );
}
