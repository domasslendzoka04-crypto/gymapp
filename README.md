# Gym Treniruočių Žurnalas

## Kaip paleisti Render platformoje (žingsnis po žingsnio)

### 1. Sukurk GitHub paskyrą
- Eik į https://github.com
- Spausk "Sign up" ir užsiregistruok (nemokamai)

### 2. Sukurk naują repozitoriją
- Prisijungęs GitHub, spausk "+" viršuje dešinėje → "New repository"
- Pavadinimas: `gymapp`
- Pasirink "Private"
- Spausk "Create repository"

### 3. Įkelk failus į GitHub
- Spausk "uploading an existing file" arba "Add file" → "Upload files"
- Įkelk visus failus iš šio aplanko (išlaikyk struktūrą)
- Spausk "Commit changes"

### 4. Sukurk Render paskyrą
- Eik į https://render.com
- Spausk "Get Started for Free"
- Prisijunk per GitHub (taip Render matys tavo kodą)

### 5. Sukurk naują Web Service Render
- Render dashboard spausk "New +" → "Web Service"
- Pasirink savo `gymapp` repozitoriją
- Render automatiškai aptiks `render.yaml` ir viską sukonfigūruos
- Spausk "Create Web Service"

### 6. Palūk ~3 minutes kol Render sukuria aplikaciją

### 7. Gausi URL
- Pvz: `https://gymapp-xxxx.onrender.com`
- Tai tavo nuolatinis adresas — veikia ir telefone ir kompiuteryje!

### 8. Įdėk į telefoną kaip aplikaciją
**iPhone:**
- Atsidaryk URL Safari naršyklėje
- Spausk "Dalintis" (share) mygtuką apačioje
- Pasirink "Pridėti prie pradžios ekrano"
- Spausk "Pridėti"

**Android:**
- Atsidaryk URL Chrome naršyklėje  
- Spausk tris taškus viršuje dešinėje
- Pasirink "Pridėti prie pradžios ekrano"

## Prisijungimo slaptažodis
`hegelmann2025`

## Pakeisti slaptažodį
Render dashboard → tavo servisas → Environment → pakeisk `ADMIN_PASSWORD` reikšmę

## Duomenų bazė
Duomenys saugomi SQLite faile `/opt/render/project/data/gym.db`
⚠️ Render nemokamame plane diskas gali būti išvalytas per redeployment.
Jei nori išsaugoti duomenis ilgai — pakomentuok ir padėsiu perkelti į nemokamą PostgreSQL.
