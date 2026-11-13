// data.js — the one place the site's facts live. Pages render from this; nothing is typed twice.
// Before changing anything here, check it against its source (arXiv, the journal, the CV).
// tools/check.py verifies every arXiv ID and title against the arXiv API.
window.DATA = {
  me: 'P. Sharma',

  // ---------- publications (newest first) ----------
  // kind: paper | software | abstract.  first: first-author.  topic: a research slug below, or 'other'.
  // "Selected publications" on the home page shows papers where I am first or second author, plus any with pin: true.
  pubs: [
    { year: 2026, kind: 'paper', first: true, topic: 'tomography',
      title: 'Strong Lensing Tomography: Double and pseudo multi-source plane strong gravitational lensing to constrain dark energy',
      authors: ['P. Sharma', 'S. Birrer', 'N. Khadka', 'T. Anguita', 'A. Bolton', 'S. Erickson'], etal: true,
      venue: 'Preprint', arxiv: '2607.01005' },
    { year: 2026, kind: 'paper', topic: 'corona',
      title: 'Linear Polarimetry of the Solar Corona During the Total Solar Eclipse of 8 April 2024: Multi-Band Observations and HDR Imaging',
      authors: ['S. Singh', 'P. Sharma', 'B. Arora', 'S. Burman', 'C. Gandhi'],
      venue: 'Solar Physics 301, 163', arxiv: '2610.26231' },
    { year: 2026, kind: 'paper', topic: 'microlensing',
      title: 'Neglecting Dynamical Microlensing Can Bias Accretion Disk Size Measurements at the Population Level',
      authors: ['J. Fagin', 'J.H.H. Chan', 'C. Stone', 'H. Best', 'P. Sharma', 'S. Miskiewicz', "M. O'Dowd"], etal: true,
      venue: 'Preprint', arxiv: '2610.37475' },
    { year: 2026, kind: 'paper', topic: 'microlensing',
      title: 'Microcaustics: Fast GPU-Accelerated Dynamical Microlensing of Time-Dependent Extended Sources',
      authors: ['J. Fagin', 'C. Stone', 'J.H.H. Chan', 'S. Miskiewicz', 'H. Best', 'P. Sharma', "M. O'Dowd"], etal: true,
      venue: 'Preprint', arxiv: '2610.19703' },
    { year: 2026, kind: 'paper', topic: 'slsim', pin: true,
      title: 'SLSim: a strong lensing population simulation package',
      authors: ['N. Khadka', 'S. Birrer', 'H. Best', 'P. Sharma', 'K.T. Abe', 'X. Tang', 'C. Mistick'], etal: true,
      venue: 'Preprint', arxiv: '2603.17138' },
    { year: 2026, kind: 'software', topic: 'slsim',
      title: 'SLSim: Strong lensing simulation pipeline',
      authors: ['N. Khadka', 'S. Birrer', 'H. Best', 'P. Sharma', 'K.T. Abe', 'X. Tang', 'C. Mistick'], etal: true,
      venue: 'Astrophysics Source Code Library', ascl: '2608.001', github: 'https://github.com/LSST-strong-lensing/slsim' },
    { year: 2025, kind: 'abstract', first: true, topic: 'other',
      title: 'On the radial profile of pattern speed in barred spiral galaxies',
      authors: ['P. Sharma', 'J. Koda', 'J. Baba'],
      venue: 'AAS Meeting Abstracts 57, 468.03' },
    { year: 2025, kind: 'abstract', topic: 'magnetic-fields',
      title: 'Unveiling Galactic Magnetism: Probing Magnetic Field Profiles with Background Quasars',
      authors: ['S. Burman', 'P. Sharma', 'S. Malik', 'S. Singh'],
      venue: '43rd meeting of the Astronomical Society of India' },
    { year: 2024, kind: 'paper', topic: 'magnetic-fields',
      title: 'Investigation of the radial profile of galactic magnetic fields using rotation measure of background quasars',
      authors: ['S. Burman', 'P. Sharma', 'S. Malik', 'S. Singh'],
      venue: 'JCAP 08 (2024) 063', arxiv: '2405.09623' },
  ],

  // ---------- research topics: one card on the home page and one page (research/<slug>.html) each, in this order ----------
  // area: the small label on the card.  thumb: the card's live drawing (a kind in assets/viz/thumbs.js), or img: a picture
  // (tools/make_thumbs.py).  alt: what the drawing or picture shows.  explainer: the page is a scroll-through figure.  To add a topic: add an entry here, its still, and a page copied from research/_template.html.
  research: [
    { slug: 'tomography', area: 'Strong lensing · cosmology', title: 'Strong lensing tomography', explainer: true,
      text: 'Lenses with sources at two distances measure a ratio of distances that depends on dark energy. Such systems are rare, so I show how pairs of ordinary lenses with near-identical deflectors can be analysed like them.',
      thumb: 'tomography',
      alt: 'Schematic of a pseudo double-source-plane lens: two lenses with near-identical deflectors, one with a nearer blue source and one with a farther red source, read as one deflector with sources at two redshifts.' },
    { slug: 'microlensing', area: 'Strong lensing · quasars', title: 'Quasar microlensing', explainer: true,
      text: 'Stars in a lens galaxy make the images of a background quasar flicker. The flickering depends on the size of the quasar’s accretion disk, so it measures structures far too small to resolve.',
      thumb: 'microlensing',
      alt: 'A microlensing magnification map with a quasar disk moving across it, and the light curve it produces: the small disk flickers more than the large one.' },
    { slug: 'slsim', area: 'Strong lensing · software', title: 'SLSim', explainer: true,
      text: 'An open-source package that simulates populations of strong lenses as observatories such as Rubin LSST, Euclid and Roman will see them. I’m one of its lead developers.',
      thumb: 'slsim',
      alt: 'Six simulated lenses with different lens and source galaxies, including a lensed quasar and a lensed supernova.' },
    { slug: 'corona', area: 'Solar physics', title: 'Polarimetry of the solar corona',
      text: 'After a rehearsal in Australia in 2023, we imaged the corona from Dallas, Texas, during the total solar eclipse of 8 April 2024, through three polarizers in three colours. The composites trace helmet streamers and fine structure out to about three solar radii.',
      img: 'assets/img/research/corona.jpg',
      alt: 'The solar corona during the 8 April 2024 eclipse, coloured by the direction of its polarization, from Singh, Sharma et al. (2026).' },
    { slug: 'magnetic-fields', area: 'Galactic magnetism', title: 'Magnetic fields around distant galaxies',
      text: 'A magnetic field rotates the polarization of radio light passing through it. Using 59 quasars seen behind galaxies traced by Mg II absorbers, we found the field is stronger close to these galaxies than farther out in their halos.',
      thumb: 'magnetic-fields',
      alt: 'Schematic: polarized light from a background quasar passes through the magnetized halo of a foreground galaxy at impact parameter D, and its polarization angle turns.' },
  ],

  // ---------- everything below also builds the CV (cv/cvmain.tex, via tools/build_cv.py) ----------
  // Text may contain simple HTML (<a href>, <b>, <em>); the CV build turns it into LaTeX. Plain Unicode is fine (σ, ≤, –, ₀).
  // site: false keeps an entry off the website (CV only); cv: false keeps it off the CV.
  person: {
    name: 'Paras Sharma', position: 'Ph.D. Student, Physics & Astronomy', affiliation: 'Stony Brook University, NY, USA', cvTitle: 'Ph.D. Student | SBU, NY, USA',
    email: 'paras.sharma@stonybrook.edu', email2: 'sharmaparasiitd@gmail.com', phone: '+1 (934) 451-9181',
    web: 'timedilatesme.github.io', github: 'timedilatesme', scholar: '45Pod_4AAAAJ',
  },

  // ---------- education (About page and CV), newest first ----------
  // years: shown on the site; dates: shown on the CV; gpa: shown on both.
  education: [
    { years: '2023 – present', dates: 'Aug. 2023 – Present', degree: 'PhD, Physics & Astronomy', cvDegree: 'Ph.D. in Physics & Astronomy',
      place: 'Stony Brook University, New York', school: 'Stony Brook University, New York, USA', url: 'https://www.stonybrook.edu', gpa: 'GPA 3.96 / 4',
      notes: [
        'Advisor: <a href="https://sibirrer.github.io">Prof. Simon Birrer</a> (strong gravitational lensing), since 2025.',
        'Earlier: dynamics of barred spiral galaxies with <a href="https://www.astro.sunysb.edu/koda/Stony_Brook/Jin_KODA.html">Prof. Jin Koda</a>.',
        'Member of the <a href="https://lsstdesc.org">LSST Dark Energy Science Collaboration</a> and the <a href="https://sites.google.com/view/lsst-stronglensing">LSST Strong Lensing Science Collaboration</a>.',
        { text: 'Transferred from the M.A. program.', cv: false },
      ] },
    { years: '2019 – 2023', dates: 'July 2019 – May 2023', degree: 'B.Tech, Engineering Physics', cvDegree: 'Bachelor of Technology in Engineering Physics',
      place: 'Indian Institute of Technology Delhi', school: 'Indian Institute of Technology, Delhi, India', url: 'https://home.iitd.ac.in', gpa: 'CGPA 9.382 / 10',
      notes: [
        'Department rank 1 in the Engineering Physics class of 2023.',
        '<a href="https://drive.google.com/drive/folders/1ai2XeKfRbB1G3CIHLI9I5U_URC2iuOhN?usp=sharing">Institute Merit Award</a>: in the top 7% of the institute for five semesters.',
        { text: 'Research on galactic magnetic fields with <a href="https://supritsingh.github.io">Prof. Suprit Singh</a>, from 2022.', cv: false },
        { text: '<a href="https://www.mitacs.ca/our-programs/globalink-research-internship-students/">Mitacs Globalink Research Intern</a> (summer 2022): the neutral interstellar medium, with <a href="https://www.cita.utoronto.ca/~pgmartin/">Prof. Peter G. Martin</a> and Dr. Antoine Marchal at the <a href="https://www.cita.utoronto.ca">Canadian Institute for Theoretical Astrophysics</a>, University of Toronto.', cv: false },
      ] },
    { site: false, years: '2017 – 2019', dates: 'Apr. 2017 – Mar. 2019', degree: 'Senior high school', cvDegree: 'Senior High School Education',
      place: 'Navyug Convent School, Delhi', school: 'Navyug Convent School, Delhi, India', gpa: 'Percentage: 90.4%', notes: [] },
  ],

  // ---------- honors (About page and CV), newest first ----------
  awards: [
    { title: 'Institute Silver Medal, IIT Delhi', url: 'https://convocation.iitd.ac.in/2023/medals-awards', detail: 'for the highest GPA in the Department of Physics', year: 2023 },
    { title: 'Mitacs Globalink Research Internship', url: 'https://drive.google.com/file/d/1aZjLnj0CrA0USvlusjpIWHfirhQPDhCo/view?usp=sharing', detail: 'summer research at the University of Toronto', year: 2022 },
    { title: 'Summer Undergraduate Research Award', url: 'https://drive.google.com/file/d/10yj_GaH3hszYTBFoxDagpKtiisoE05hu/view?usp=sharing', detail: 'Industrial R&D Unit, IIT Delhi', year: 2021 },
    { title: 'Mudit Sharma Memorial Scholarship', url: 'https://drive.google.com/open?id=1wbCMwuLhYnwS4iVP5s47BkTSHmn7uzbn', detail: 'for the highest GPA in the department', year: 2021 },
    { title: 'B-83 Scholarship', url: 'https://drive.google.com/open?id=1rKIftuntKIHTrlGe_m7FDgupJhQkM_Yp', detail: 'from the IIT Delhi class of 1983, for academic excellence', year: 2021 },
    { title: 'IIT-JEE 2019', detail: 'in the top 0.2% of 1.2 million candidates across India', year: 2019 },
  ],

  // ---------- talks (CV), newest first ----------
  talks: [
    { title: 'Strong lensing tomography', event: 'Astrophysics Seminar', place: 'American Museum of Natural History, New York', date: 'Oct. 29, 2026' },
    { title: 'Strong lensing tomography', event: 'Cosmology Seminar', place: 'Yale University', date: 'Mar. 27, 2026' },
  ],

  // ---------- CV only ----------
  collaborations: [
    { name: 'LSST Dark Energy Science Collaboration (DESC)', url: 'https://lsstdesc.org' },
    { name: 'LSST Strong Lensing Science Collaboration (SLSC)', url: 'https://sites.google.com/view/lsst-stronglensing' },
  ],
  experience: [ // research experience, newest first
    { title: 'Probing Accretion Disk Sizes with Microlensing of Lensed AGN Light Curves from LSST', dates: 'Apr. 2025 – Present',
      people: 'Collaborators: <a href="https://sibirrer.github.io">Prof. Simon Birrer</a>, Dr. Joshua Fagin, Dr. Henry Best, and others',
      points: [
        'Using simulations to train a simulation-based-inference forward model that learns how microlensing alters the multi-band light curves of strongly lensed AGN, with realistic LSST cadences, time-variable microlensing, and realistic source-quasar and deflector populations.',
        'Aiming to constrain the temperature power-law slope, black-hole mass and wavelength dependence of disk size for AGN accretion disks in the thin-disk model.',
      ] },
    { title: 'Constraining Dark Energy with Pseudo-Double-Source-Plane Strong Gravitational Lenses', dates: 'Apr. 2025 – Present',
      people: 'Supervisor: <a href="https://sibirrer.github.io">Prof. Simon Birrer</a>, Department of Physics & Astronomy, Stony Brook University',
      points: [
        'Pairing single-source-plane galaxy–galaxy lenses with near-identical deflectors to mimic double-source-plane lenses, which avoids the intermediate source’s mass and its mass-sheet degeneracy.',
        'With the LSST Y10 galaxy–galaxy lens sample, forecast constraints on flat w₀wₐCDM reach σ(w₀) ≈ 0.27.',
        'Establishes pseudo-DSPLs and strong lensing tomography as a complementary probe of dark energy.',
      ] },
    { title: 'SLSim: Strong Lensing Simulation Pipeline', dates: '', // start date: to confirm
      people: 'Co-lead developer and maintainer, with the LSST Strong Lensing and Dark Energy Science Collaborations',
      points: [
        'Open-source package that simulates populations of strong lenses (galaxies, lensed quasars, lensed supernovae) as Rubin LSST, Euclid, Roman and other observatories will see them. <a href="https://github.com/LSST-strong-lensing/slsim">github.com/LSST-strong-lensing/slsim</a>',
      ] },
    { title: 'Multi-Band Linear Polarimetry of the Solar Corona during Total Solar Eclipses', dates: 'Apr. 2023 – 2026', // to confirm
      people: 'Supervisor: <a href="https://supritsingh.github.io">Prof. Suprit Singh</a>, Department of Physics, IIT Delhi',
      points: [
        'Observed the total solar eclipses of 20 April 2023 (Exmouth, Australia) and 8 April 2024 (Dallas, Texas), imaging the corona in red, green and blue through polarizers at −60°, 0° and +60° over a nine-step exposure bracket.',
        'Reduction pipeline: registration by lunar-limb fitting and plate solving, photometrically linear HDR synthesis, and multi-scale Gaussian normalization with polarization mapped to colour.',
      ] },
    { title: 'Understanding Galactic Dynamics with Pattern Speed Estimation', dates: 'Aug. 2023 – July 2024',
      people: 'Supervisor: <a href="https://www.astro.sunysb.edu/koda/Stony_Brook/Jin_KODA.html">Prof. Jin Koda</a>, Department of Physics & Astronomy, Stony Brook University',
      points: [
        'Analysed the variation of the pattern speed in N-body hydrodynamic simulations of a Milky-Way-like galaxy.',
        'Tested pattern-speed estimators such as the Tremaine–Weinberg method, and modifications of it, for real observations of barred spiral galaxies.',
      ] },
    { title: 'Estimating Galactic Magnetic Fields using Mg II Absorbers and Background Quasars', dates: 'Aug. 2022 – Aug. 2024',
      people: 'Supervisors: <a href="https://supritsingh.github.io">Prof. Suprit Singh</a> (IIT Delhi) and Dr. Sunil Malik (Universität Potsdam)',
      points: [
        'Matched the NVSS rotation-measure catalogue of 37K sources to 750K quasars from SDSS DR16.',
        'Probed line-of-sight magnetic fields in galaxies at 0.37 ≤ z ≤ 0.8 through the excess residual rotation measure of quasar sightlines with and without intervening Mg II absorbers.',
      ] },
  ],
  teaching: [
    { role: 'Graduate Teaching Assistant', url: 'https://drive.google.com/file/d/1anb1oFf2TK0o_2Bdxb45pI-J-EMth8js/view?usp=sharing', course: 'AST443/PHY517: Astronomy Laboratory', dates: 'Fall 2024 – Spring 2026',
      points: ['Assisted students with astronomical observations at the Mt. Stony Brook Observatory.', 'Held weekly office hours for graduate and undergraduate students on data analysis.'] },
    { role: 'Undergraduate Teaching Assistant', url: 'https://drive.google.com/file/d/1anb1oFf2TK0o_2Bdxb45pI-J-EMth8js/view?usp=sharing', course: 'PYL121: Mathematical Physics, IIT Delhi', dates: 'Fall 2022',
      points: ['The only student in the department selected as an undergraduate TA.', 'Ran weekly help sessions, graded answer scripts and prepared assignments.'] },
  ],
  skills: [
    { label: 'Software development', text: 'Co-lead developer and maintainer of <a href="https://github.com/LSST-strong-lensing/slsim">SLSim</a>.' },
    { label: 'Programming', text: 'Python, Julia.' },
    { label: 'Tools', text: 'Git/GitHub, LaTeX, Markdown.' },
    { label: 'Languages', text: 'Hindi (native), English (C1).' },
  ],
  competitions: [
    { title: 'International Theoretical Physics Olympiad', url: 'http://thworldcup.com/contest2021', result: 'Rank 12 of 150+ teams worldwide', dates: 'Jan. 2021',
      points: ['Rigorous theoretical physics problems within 24 hours.'] },
    { title: 'The University Physics Competition', url: 'http://www.uphysicsc.com/2020contest.html', result: 'Silver Medal (rank 12 of 244 teams worldwide)', dates: 'Nov. 2020',
      points: ['Optimal ion-thruster trajectory for a satellite from Earth’s low orbit to Saturn’s orbit; co-authored “<a href="https://drive.google.com/file/d/1anF7My_90wUtD4LNMGPJCXb8eQbVG8gY/view?usp=sharing">Ion Thrusters to Saturn</a>” within 48 hours. <a href="http://www.uphysicsc.com/certificates2020/227.pdf">Certificate</a>.'] },
  ],
  coursework: [
    { label: 'Graduate astronomy', text: 'Astrophysical Fluids and Plasma, Cosmology, Observational Techniques in Astronomy, Galaxies, Stars, Gravitational Lensing.' },
    { label: 'Graduate physics', text: 'General Relativity & Cosmology, Field Theory & Quantum Electrodynamics, Quantum Information & Computation, Computational Optical Imaging, Non-Linear Dynamics and Chaos, Statistical Mechanics.' },
    { label: 'Undergraduate physics', text: 'Statistical Physics, Computational Physics, Particle Accelerators, Applied Quantum Mechanics, Electrodynamics, Classical Mechanics and Relativity, Optics and Photonics, Mathematical Physics, Solid State Physics.' },
  ],
  outreach: [
    { label: 'Extragalactic astronomy talk', text: 'Presented my work on magnetic-field estimation with radio observations of background quasars at the Physics and Astronomy Club, IIT Delhi. <a href="https://www.instagram.com/p/CkdIbpooa_V/">Announcement</a>.' },
    { label: 'Science communication', text: 'Educational videos on physics. <a href="http://www.youtube.com/c/nutanstrek">YouTube channel</a>.' },
    { label: 'Gramoly', text: 'Organized online boot camps and a lecture series on the basics of tensors and differential geometry for high-school and college students. <a href="https://www.youtube.com/playlist?list=PL70VV8-MvPJA-om0Zjpou3kxEhkQuFvVg">Lectures</a>.' },
  ],
};
