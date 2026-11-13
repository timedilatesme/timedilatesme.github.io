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

  // ---------- education (About page), newest first. Notes may contain links (this file is ours, so HTML is allowed). ----------
  // Source: the CV (assets/docs/Paras_CV.pdf); Stony Brook GPA as given by Paras (November 2026).
  education: [
    { years: '2023 – present', degree: 'PhD, Physics & Astronomy', place: 'Stony Brook University, New York', url: 'https://www.stonybrook.edu',
      notes: [
        'GPA 3.96 / 4.',
        'Advisor: <a href="https://sibirrer.github.io">Prof. Simon Birrer</a> (strong gravitational lensing), since 2025.',
        'Earlier: dynamics of barred spiral galaxies with <a href="https://www.astro.sunysb.edu/koda/Stony_Brook/Jin_KODA.html">Prof. Jin Koda</a> (2023 – 2025).',
        'Member of the <a href="https://lsstdesc.org">LSST Dark Energy Science Collaboration</a> and the <a href="https://sites.google.com/view/lsst-stronglensing">LSST Strong Lensing Science Collaboration</a>.',
        'Transferred from the M.A. program.',
      ] },
    { years: '2019 – 2023', degree: 'B.Tech, Engineering Physics', place: 'Indian Institute of Technology Delhi', url: 'https://home.iitd.ac.in',
      notes: [
        'CGPA 9.382 / 10; department rank 1 in the Engineering Physics class of 2023.',
        'Institute Silver Medal (2023), for the highest GPA in the Department of Physics.',
        'Institute Merit Award: in the top 7% of the institute for five semesters.',
        'Research on galactic magnetic fields with <a href="https://supritsingh.github.io">Prof. Suprit Singh</a> (2022 – 2023).',
        '<a href="https://www.mitacs.ca/our-programs/globalink-research-internship-students/">Mitacs Globalink Research Intern</a> (summer 2022): the neutral interstellar medium, with <a href="https://www.cita.utoronto.ca/~pgmartin/">Prof. Peter G. Martin</a> and Dr. Antoine Marchal at the <a href="https://www.cita.utoronto.ca">Canadian Institute for Theoretical Astrophysics</a>, University of Toronto.',
        'Summer Undergraduate Research Award, IIT Delhi (2021).',
      ] },
  ],
};
