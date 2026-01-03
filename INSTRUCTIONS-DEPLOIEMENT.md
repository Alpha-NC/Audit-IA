# Instructions de Déploiement - Audit IA Alpha No-Code

Ce guide vous explique **pas à pas** comment déployer le formulaire d'audit IA sur GitHub Pages et configurer le workflow n8n.

---

## Table des matières

1. [Prérequis](#1-prérequis)
2. [Partie A : Déployer sur GitHub Pages](#partie-a--déployer-sur-github-pages)
3. [Partie B : Configurer n8n](#partie-b--configurer-n8n)
4. [Partie C : Configurer Notion](#partie-c--configurer-notion)
5. [Partie D : Configurer l'envoi d'emails](#partie-d--configurer-lenvoi-demails)
6. [Partie E : Tester le formulaire](#partie-e--tester-le-formulaire)
7. [Dépannage](#dépannage)

---

## 1. Prérequis

Avant de commencer, vous devez avoir :

- ✅ Un compte **GitHub** (gratuit) → [Créer un compte](https://github.com/signup)
- ✅ Un compte **n8n** (self-hosted ou n8n Cloud) → [n8n.io](https://n8n.io)
- ✅ Un compte **Notion** avec une base de données → [notion.so](https://notion.so)
- ✅ Un compte email SMTP pour l'envoi d'emails (Gmail, SendGrid, etc.)

---

## Partie A : Déployer sur GitHub Pages

### Étape A1 : Créer un nouveau repository GitHub

1. **Connectez-vous à GitHub** : Allez sur [github.com](https://github.com) et connectez-vous
2. **Cliquez sur le bouton vert "New"** (en haut à gauche, ou via le menu +)
3. **Configurez le repository** :
   - **Repository name** : `audit-ia` (ou le nom de votre choix)
   - **Description** : "Formulaire d'audit IA - Alpha No-Code"
   - **Visibility** : `Public` (obligatoire pour GitHub Pages gratuit)
   - ❌ Ne cochez PAS "Add a README file"
4. **Cliquez sur "Create repository"**

### Étape A2 : Uploader les fichiers

1. Sur la page de votre nouveau repository, cliquez sur **"uploading an existing file"**
2. **Glissez-déposez** les fichiers suivants :
   - `index.html`
   - `styles.css`
   - `app.js`
   - `schema.json`
   - `.nojekyll`
3. En bas de la page :
   - **Commit message** : "Initial commit - Audit IA form"
   - Cliquez sur **"Commit changes"**

### Étape A3 : Activer GitHub Pages

1. Dans votre repository, cliquez sur **"Settings"** (onglet en haut)
2. Dans le menu de gauche, cliquez sur **"Pages"**
3. Dans la section **"Source"** :
   - **Branch** : sélectionnez `main`
   - **Folder** : sélectionnez `/ (root)`
4. Cliquez sur **"Save"**
5. ⏳ Attendez 2-3 minutes
6. **Votre site est en ligne !** L'URL sera : `https://VOTRE-USERNAME.github.io/audit-ia/`

### Étape A4 : Mettre à jour l'URL du webhook dans app.js

⚠️ **Important** : Avant que le formulaire fonctionne, vous devez configurer l'URL du webhook.

1. Dans votre repository, cliquez sur le fichier `app.js`
2. Cliquez sur l'icône **crayon** (Edit) en haut à droite
3. Trouvez ces lignes (vers le début du fichier) :

```javascript
const CONFIG = {
  WEBHOOK_URL: 'https://<N8N_DOMAIN>/webhook/audit-ia',
  WEBHOOK_TOKEN: '<TOKEN>',
```

4. Remplacez par vos vraies valeurs (que vous obtiendrez dans la Partie B) :

```javascript
const CONFIG = {
  WEBHOOK_URL: 'https://votre-n8n.app/webhook/audit-ia',
  WEBHOOK_TOKEN: 'votre-token-secret-ici',
```

5. Cliquez sur **"Commit changes"** en bas

---

## Partie B : Configurer n8n

### Étape B1 : Importer le workflow

1. **Connectez-vous à n8n**
2. Dans le menu de gauche, cliquez sur **"Workflows"**
3. Cliquez sur **"Add workflow"** (ou le bouton +)
4. Cliquez sur les **trois points** (...) en haut à droite
5. Sélectionnez **"Import from file"**
6. Choisissez le fichier `n8n-workflow-audit-ia.json`
7. Le workflow s'ouvre avec tous les nœuds

### Étape B2 : Configurer le token de sécurité

Le token empêche des personnes non autorisées d'envoyer des données à votre webhook.

1. **Inventez un token secret** : Par exemple `MonTokenSecret2024!` (au moins 16 caractères)
2. Dans n8n, **double-cliquez sur le nœud "Validate Token"**
3. Trouvez la condition avec `<TOKEN>` et remplacez par votre token
4. **Notez ce token** : vous en aurez besoin pour app.js

### Étape B3 : Configurer le webhook

1. **Double-cliquez sur le nœud "Webhook - Audit IA"**
2. Notez l'URL du webhook qui apparaît (elle ressemble à) :
   - n8n Cloud : `https://votre-instance.app.n8n.cloud/webhook/audit-ia`
   - Self-hosted : `https://votre-domaine.com/webhook/audit-ia`
3. **Vérifiez les paramètres CORS** :
   - `Allowed Origins` doit contenir votre URL GitHub Pages
   - Par défaut : `https://alpha-nc.github.io`
   - Modifiez si votre URL est différente

### Étape B4 : Activer le workflow

1. En haut à droite du workflow, cliquez sur le **toggle "Inactive"**
2. Le workflow passe en **"Active"** (vert)
3. Cliquez sur **"Save"** pour sauvegarder

---

## Partie C : Configurer Notion

### Étape C1 : Créer la base de données Notion

1. **Ouvrez Notion** et créez une nouvelle page
2. Tapez `/database` et sélectionnez **"Table - Full page"**
3. Nommez-la : **"Audit-IA"**

### Étape C2 : Créer les colonnes (propriétés)

Créez les colonnes suivantes avec les types indiqués :

| Nom de la colonne | Type | Notes |
|-------------------|------|-------|
| Title | Title | (par défaut) |
| Date de soumission | Date | |
| SubmissionId | Text | |
| Entreprise | Text | |
| Prénom | Text | |
| Nom | Text | |
| Email | Email | |
| Téléphone | Phone | |
| Secteur | Select | Options : Artisan / BTP, Agence marketing, Intérim / RH, Cabinet HSE / QHSE, Commerce / e-commerce, Services B2B, Autre |
| Type clients | Select | Options : B2B, B2C, B2B + B2C |
| Effectif | Number | |
| Douleur principale | Text | |
| Score douleur | Number | |
| Process ciblé | Select | Options : devis, factures, relances, leads, support, reporting, autre |
| Volume | Number | |
| Unité volume | Select | Options : /mois, /semaine |
| Impact erreurs | Text | |
| Urgence | Select | Options : 1–2 semaines, 1 mois, 3 mois, pas pressé |
| Décision | Select | Options : je décide, décision partagée, je dois convaincre |
| Budget | Select | Options : 0–300, 300–900, 900–2500, 2500+ |
| Objectif type | Select | Options : temps, chiffre, erreurs, autre |
| Objectif valeur | Number | |
| Objectif texte | Text | |
| Canal préféré | Select | Options : email, téléphone, whatsapp |
| Créneau | Select | Options : matin, après-midi, soir |
| UTM Source | Text | |
| UTM Medium | Text | |
| UTM Campaign | Text | |
| UTM Term | Text | |
| UTM Content | Text | |
| Ref | Text | |
| Variant | Text | |
| ID Session | Text | |
| Résumé analyse | Text | |
| Priorité | Select | Options : P1, P2, P3 |

### Étape C3 : Créer une intégration Notion

1. Allez sur [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Cliquez sur **"+ New integration"**
3. **Configurez l'intégration** :
   - **Name** : "n8n Audit IA"
   - **Associated workspace** : Votre workspace
   - **Capabilities** : Cochez "Read content", "Update content", "Insert content"
4. Cliquez sur **"Submit"**
5. **Copiez le "Internal Integration Token"** (il commence par `secret_...`)

### Étape C4 : Partager la base avec l'intégration

1. Ouvrez votre base de données "Audit-IA" dans Notion
2. Cliquez sur les **trois points** (...) en haut à droite
3. Cliquez sur **"Add connections"**
4. Cherchez et sélectionnez **"n8n Audit IA"** (votre intégration)

### Étape C5 : Configurer les credentials Notion dans n8n

1. Dans n8n, allez dans **Settings > Credentials**
2. Cliquez sur **"Add Credential"**
3. Cherchez **"Notion API"**
4. **Collez votre token** (celui qui commence par `secret_...`)
5. Cliquez sur **"Save"**

### Étape C6 : Configurer le nœud Notion dans le workflow

1. Ouvrez votre workflow
2. **Double-cliquez sur le nœud "Notion - Create Page"**
3. Dans **"Credential to connect with"**, sélectionnez votre credential Notion
4. Dans **"Database"**, sélectionnez votre base "Audit-IA"
5. Cliquez sur **"Save"**

---

## Partie D : Configurer l'envoi d'emails

### Option 1 : Utiliser Gmail

1. **Activez l'authentification 2 facteurs** sur votre compte Google
2. Allez sur [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Créez un **mot de passe d'application** :
   - App : "Mail"
   - Device : "n8n"
4. **Copiez le mot de passe généré** (16 caractères sans espaces)

5. Dans n8n, allez dans **Settings > Credentials**
6. Cliquez sur **"Add Credential"**
7. Cherchez **"SMTP"**
8. Configurez :
   - **Host** : `smtp.gmail.com`
   - **Port** : `465`
   - **User** : votre adresse Gmail
   - **Password** : le mot de passe d'application (16 caractères)
   - **SSL/TLS** : `true`
9. Cliquez sur **"Save"**

### Option 2 : Utiliser un autre service SMTP

Consultez la documentation de votre fournisseur (SendGrid, Mailjet, etc.) pour les paramètres SMTP.

### Configurer le nœud Email dans le workflow

1. **Double-cliquez sur le nœud "Send Email"**
2. Dans **"Credential to connect with"**, sélectionnez votre credential SMTP
3. Vérifiez que l'adresse destinataire est correcte : `agence.alphanc@gmail.com`
4. Cliquez sur **"Save"**

---

## Partie E : Tester le formulaire

### Test 1 : Soumission directe (sans UTM)

1. Ouvrez votre formulaire : `https://VOTRE-USERNAME.github.io/audit-ia/`
2. Remplissez toutes les étapes avec des données test
3. Soumettez le formulaire
4. **Vérifiez** :
   - ✅ Page 7 s'affiche avec l'analyse
   - ✅ L'analyse affiche "Source : Direct"
   - ✅ Email reçu dans votre boîte
   - ✅ Nouvelle ligne dans Notion

### Test 2 : Soumission avec UTM

1. Ouvrez cette URL :
```
https://VOTRE-USERNAME.github.io/audit-ia/?utm_source=test&utm_medium=email&utm_campaign=demo
```
2. Remplissez et soumettez
3. **Vérifiez** :
   - ✅ L'analyse affiche "Source : test"
   - ✅ Les UTM sont dans Notion et l'email

### Test 3 : Simuler une erreur Notion

1. Dans n8n, désactivez temporairement le credential Notion
2. Soumettez un formulaire
3. **Vérifiez** :
   - ✅ L'email est quand même envoyé
   - ✅ Le front affiche toujours l'analyse (avec warning)
   - ✅ La réponse JSON contient `ok: true` (malgré l'échec Notion)

---

## Dépannage

### Le formulaire ne charge pas

- Vérifiez que GitHub Pages est activé (Settings > Pages)
- Attendez 5 minutes après l'activation
- Videz le cache du navigateur (Ctrl+Shift+R)

### Erreur "Token invalide"

- Vérifiez que le token dans `app.js` correspond exactement à celui dans n8n
- Pas d'espaces avant/après le token

### Erreur CORS

- Dans n8n, vérifiez que `Allowed Origins` contient votre URL exacte
- L'URL doit inclure `https://` et ne pas avoir de `/` à la fin

### Email non reçu

- Vérifiez les spam/indésirables
- Testez le credential SMTP dans n8n (bouton "Test")
- Pour Gmail : vérifiez que le mot de passe d'application est correct

### Page Notion non créée

- Vérifiez que l'intégration est bien connectée à la base
- Vérifiez que les noms de colonnes correspondent exactement
- Testez le credential Notion dans n8n

### L'analyse ne s'affiche pas

- Ouvrez la console du navigateur (F12 > Console)
- Cherchez les erreurs en rouge
- Vérifiez que le webhook n8n est actif

---

## Support

Pour toute question :
- 📧 Email : agence.alphanc@gmail.com
- 📅 Calendly : https://calendly.com/agence-alphanc/audit-decouverte

---

**Bonne configuration ! 🚀**
