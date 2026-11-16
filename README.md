<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./web-app/public/icons/logos/spark-readme-dark.svg">
    <img src="./web-app/public/icons/logos/spark-readme-light.svg" alt="sPARK" width="150">
  </picture>
</h1>
<p align="center">
  <strong>Park Smart - Made by students for students.</strong>
</p>

<p align="center">
  Smart parking predictions for San Jose State University
</p>

<p align="center">
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16-000000?logo=Next.js" alt="Next.js 16"></a>
  <a href="https://supabase.com/"><img src="https://img.shields.io/badge/Supabase-Postgres-3ECF8E?logo=supabase&logoColor=white" alt="Supabase Postgres"></a>
  <a href="https://www.python.org/"><img src="https://img.shields.io/badge/Python-3.13-3776AB?logo=python&logoColor=white" alt="Python 3.13"></a>
  <a href="https://scikit-learn.org/stable/"><img src="https://img.shields.io/badge/scikit--learn-Boosted%20trees-F7931E?logo=scikitlearn&logoColor=white" alt="scikit-learn for boosted trees"></a>
  <a href="https://flask.palletsprojects.com/en/stable/"><img src="https://img.shields.io/badge/Flask-Model%20serving-3B7285?logo=flask&logoColor=white" alt="Flask for model serving"></a>
  <img src="https://img.shields.io/badge/status-beta-blueviolet" alt="Beta">
  <br><br>
  <a href="https://sparkparking.vercel.app/"><strong>Try the sPARK beta</strong></a>
  <br><br>
  If you find this project helpful, please consider giving it a ⭐ on GitHub!
</p>

---

## Table of Contents

-   [📖 About](#about)
-   [✨ Features](#features)
-   [🔥 Flint & sPARK Lab](#flint)
-   [🔄 How It Works](#how-it-works)
-   [🧩 Roadmap](#roadmap)
-   [🛠️ Technologies Used](#technologies-used)
-   [📚 Getting Started](#getting-started)
-   [⚙️ Running the Application](#running-the-application)
-   [🔧 Environment Variables](#environment-variables)
-   [🤝 Contributing](#contributing)
-   [📜 License](#license)

---

<a id="about"></a>

## 📖 About

sPARK is a web platform that forecasts parking availability for San Jose State University. It shows live garage occupancy and forecasts from Flint, a model I trained on historical garage readings.

With sPARK, you can decide where to park before you head to campus. Check which garages have space now, or pick an arrival time to see how full they’re expected to be when you get there.

I built sPARK as an independent project because finding parking was a problem for me and a lot of my friends at school. I’ve heard stories of students getting to campus hours before class just to make sure they find a spot. I wanted to make it easier to decide when to leave and where to park, so we could spend less time looking for a spot and get to class on time.

---

<a id="features"></a>

## ✨ Features

-   **Real-time & Forecast Parking**\
    Check how many spaces are left and when the latest reading came in. Pause live updates to hold that snapshot, or pick a date and time up to six days ahead. The cards also show when a garage is expected to get busier or free up.

-   **Find the Right Garage**\
    Sort by spaces left, how full each garage is, garage name, or walking distance to your campus building. You can also compare how many accessible, employee, 20-minute, motorcycle, or EV spots each garage has.

-   **Garage Details & Daily Forecasts**\
    Open a garage to see live availability, capacity, hours, permit and payment info, and Google Maps directions. Scroll through the day’s forecast and inspect occupancy by touch, mouse, or keyboard. Each garage has a shareable link with its own preview.

-   **Quick Tour & Beta Feedback**\
    The first-visit guide uses an animated campus map and interactive examples to show how to check spaces, pick an arrival time, and park near your building. Use the feedback form to tell me what’s working or what could be better.

---

<a id="flint"></a>

## 🔥 Flint & sPARK Lab

Flint predicts how full a garage will be on a 0–100% scale. I built the training and evaluation code in Python and trained the models locally on CPU in [sPARK Lab](lab/README.md).

### How I trained it

I used historical occupancy readings from all four garages. I rounded the readings to half-hour slots, removed invalid readings and a period when the feed was stuck, and kept one training reading per garage and slot. I joined the readings with the SJSU academic calendar and federal holidays. The [Flint v0.3 beta checkpoint](lab/models/flint_v0.3/README.md) was fitted on **58,795 readings** from October 21, 2025 through September 19, 2026.

| Version | What I built |
| --- | --- |
| [Flint v0.1](lab/experiments/flint_v0.1/README.md) | Started with scikit-learn’s histogram gradient-boosted trees using the garage, time of day, weekday, holidays, and where the date falls in the academic term. |
| [Flint v0.2](lab/experiments/flint_v0.2/README.md) | Tuned the tree settings and chose the recipe with the lowest daytime error on a later validation period. |
| [Flint v0.3](lab/experiments/flint_v0.3/README.md) | Added occupancy at the same time last week and an average from comparable days in the prior two weeks, for nine inputs total. |

The trees struggled when classes first resumed, so I added an adjustment that blends their prediction with the typical occupancy from earlier opening weeks. The model leans more on the trees as readings come in for the new term. A same-day update can also lower the forecast when live readings show a near-full garage has started clearing.

### How I tested it

I replayed historical forecasts by refitting v0.2 and v0.3 on the same 41 Sundays using earlier readings. I compared both versions on **32,135 observed daytime half-hours**, with a simulated issue time 30 minutes before each target slot. Mean absolute error is measured in occupancy percentage points.

| Same-day replay | Flint v0.2 | Flint v0.3 |
| --- | ---: | ---: |
| Average daytime error | 8.46 pp | **5.57 pp** |
| Average error on ordinary class days | 6.46 pp | **4.11 pp** |
| Average error on campus holidays | 15.01 pp | **4.77 pp** |

On the first day of fall classes, v0.3 caught **33 of 37** near-full slots, up from **0 of 37** with v0.2. Near-full means at least 93% occupied. The spring opening was harder. With no earlier opening in the archive, v0.3 missed all 34 near-full slots on the first day. I chose the clearing rule after reviewing the fall replay, so accuracy on a fresh opening still needs validation. Forecasts issued several days ahead need their own replay. [Full replay results](lab/experiments/flint_v0.3/README.md#evaluation) · [Training and replay commands](lab/experiments/flint_v0.3/README.md#reproduce)

---

<a id="how-it-works"></a>

## 🔄 How It Works

```text
SJSU occupancy feed → Next.js scraper → Supabase → Live garage cards
Supabase readings + academic calendar → Flint on Vercel → Supabase → Forecasts in the app
```

-   **Collecting live data**\
    I wrote a scraper that parses the SJSU feed with Cheerio, timestamps the readings, saves them in Supabase Postgres, and clears the Redis occupancy cache. The app polls for new data and can also refresh when Supabase Realtime sees a new reading.

-   **Serving forecasts**\
    The [scheduled Next.js forecast job](web-app/src/app/api/cron/forecast/README.md) builds a list of half-hour slots during garage opening hours. It sends those slots, calendar data, and readings available at the time to a private Flask service on Vercel. The service verifies the saved model’s checksum and reuses the lab’s feature code. By default, the job saves forecasts for the rest of today and the next six Pacific calendar days. It also saves a same-time three-week average in a separate table for comparison with Flint.

-   **Building the parking interface**\
    I built the draggable date and time sheet, the 15-minute time ruler, and the scrollable garage chart that shows predicted occupancy as you drag. The app caches forecast data with SWR and interpolates between half-hour predictions when you pick a time in between. The time controls and charts support keyboard navigation, and the interface respects reduced-motion preferences.

-   **Sharing and home-screen support**\
    Garage pages use native share controls with a copy-link fallback. I added the standalone web app manifest, home-screen icons, and branded link previews.

-   **Routing and trip planning**\
    I use OpenRouteService to calculate walking distances from garages to campus buildings, then save those results in Supabase so they can be reused. Google Maps handles maps and directions. I also built the trip planner’s recommendation API. It uses OpenCage for address lookup and ranks garages using travel time and forecast occupancy.

-   **Analytics and feedback**\
    I added PostHog events for page views, sorting, forecast selections, and directions. The beta feedback form submits through a validated API route. Session recording and automatic click capture are disabled.

---

<a id="roadmap"></a>

## 🧩 Roadmap

-   🚧 **In Progress**

    -   UI polish and beta feedback
    -   “Plan Your Trip” feature (recommendations for best garage, leave time, and walking distance)

-   🚀 **Planned**
    -   **AI Schedule Parser / Planner**\
        Upload a screenshot of your class schedule and sPARK will use AI to extract your classes and buildings, calculate recommended leave times for each day, and prefill the trip planner. Includes multiple schedules, editable plans, and automatic trip planning.
    -   **Notifications**\
        Receive leave-time reminders and alerts if your preferred garages are nearing capacity or trip conditions change.

---

<a id="technologies-used"></a>

## 🛠️ Technologies Used

-   **Frontend** uses Next.js, React, CSS, Framer Motion, and SWR.
-   **Backend** uses Node.js, Cheerio, Supabase Postgres and Realtime, Redis, and Arcjet.
-   **Maps & routing** use Google Maps, OpenRouteService, and OpenCage.
-   **Forecasting** uses Python with pandas and NumPy for data prep, scikit-learn for training, joblib for the saved model, and Flask for serving predictions.
-   **Analytics & feedback** use PostHog.
-   **Deployment** runs on Vercel.

---

<a id="getting-started"></a>

## 📚 Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (v22 recommended)
-   [npm](https://www.npmjs.com/) (v10+ recommended)
-   Python 3.13 if you’re running Flint or working in the lab

### Installation

1. **Clone the Repository**

    ```bash
    git clone https://github.com/ItaiHammer/sPARK.git
    cd sPARK
    ```

2. **Install Dependencies**
    ```bash
    cd web-app
    npm ci
    ```

---

<a id="running-the-application"></a>

## ⚙️ Running the Application

Set up `web-app/.env.local` using the settings below. Then, from `web-app/`, run:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app reads live occupancy and saved forecasts from your Supabase project, so use a development database with the sPARK schema and parking data. To generate forecasts yourself, follow the [forecasting setup](web-app/src/app/api/cron/forecast/README.md).

---

<a id="environment-variables"></a>

## 🔧 Environment Variables

Add the settings for the features you’re working on to `web-app/.env.local`.

| Used for | Variables |
| --- | --- |
| Garage data and saved forecasts | `SUPABASE_PROJECT_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| App API requests | `INTERNAL_API_KEY`, `NEXT_PUBLIC_INTERNAL_API_KEY` |
| API protection and caching | `ARCJET_KEY`, `REDIS_URL` (host), `REDIS_PORT`, `REDIS_PASSWORD` |
| Supabase Realtime updates | `NEXT_PUBLIC_SUPABASE_PROJECT_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Walking distances and address lookup | `OPENROUTE_SERVICE_URL`, `OPENROUTE_SERVICE_API_KEY`, `OPENCAGE_API_KEY` |
| Beta feedback and analytics | `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, `NEXT_PUBLIC_POSTHOG_HOST` |
| Forecast job and Flint service | `FORECASTING_API_KEY`, `FLINT_SERVICE_URL` |
| Occupancy scraper | `SCRAPING_API_KEY`, `SCRAPER_USER_AGENT` |
| Share previews | `NEXT_PUBLIC_WEB_APP_URL` |

For local testing, give both app API key variables the same development-only value. Variables starting with `NEXT_PUBLIC_` are visible in the browser. Keep your service role key and other server credentials in server-side variables.

---

<a id="contributing"></a>

## 🤝 Contributing

Contributions are welcome! Open an issue or submit a pull request with features or bug fixes.

---

<a id="license"></a>

## 📜 License

This project is licensed under the MIT License.

[Back to top](#table-of-contents)
