'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, duration, distance) {
    this.coords = coords;
    this.duration = duration;
    this.distance = distance;
  }

  _setDuration() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, duration, distance, cadence) {
    super(coords, duration, distance);
    this.cadence = cadence;

    this.calcPace();
    this._setDuration();
  }

  calcPace() {
    this.pace = this.duration / this.distance;

    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, duration, distance, elevationGain, speed) {
    super(coords, duration, distance);
    this.elevationGain = elevationGain;
    this.speed = speed;

    this.calcSpeed();
    this._setDuration();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);

    return this.speed;
  }
}

// const running1 = new Running([39, -12],24,5.2,170)
// const cycling1 = new Cycling([39,-12],95,27,523)
// console.log(running1, cycling1);

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const logoReset = document.querySelector('.logo-reset')

// APPLICATION ARCHITECTURE
class App {
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #workouts = [];
  constructor() {
    this._getPostion();
    
    this._getLocalStorage()

    form.addEventListener('submit', this._newWorkout.bind(this));

    inputType.addEventListener('change', this._toggleElevationGain);

    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    this.reset()
  }

  _getPostion() {
    // menggunakan if ini untuk mengatasi error pada old browser
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('You didnt allow location !');
        }
      );
    }
  }

  _loadMap(position) {
   //  console.log(position);
    // const latitude = position.coords.latitude
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];

    //  console.log(`https://www.google.co.id/maps/@${latitude}, ${longitude}`);

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
   //  console.log(this);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => { 
      this._renderWorkoutMarker(work)
    //   console.log(work);
   })
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;

    form.classList.remove('hidden');
    // jika di click input distance akan langsung di pointer
    inputDistance.focus();
  }

  _hideForm() {
    // prettier-ignore
    inputDistance.value = inputCadence.value = inputDuration.value = inputElevation.value = '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationGain() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInput = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    e.preventDefault();

    //  GET DATA FROM  FORM
    const type = inputType.value; // MEMILIKI 2 OPTION VALUE
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // CHECK IF DATA IS VALID

    // IF WORKOUT RUNNING, CREATE RUNNING OBJECT
    if (type === 'running') {
      const cadence = +inputCadence.value;

      // CHECK IF DATA IS VALID
      if (
        //   !Number.isFinite(distance) ||
        //   !Number.isFinite(duration) ||
        //   !Number.isFinite(cadence)
        !validInput(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('You should input positive number');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // IF WORKOUT CYCLING, CREATE CYCLING OBJECT
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInput(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('You should input positive number');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // ADD NEW OBJECT TO WORKOUT ARRAY
    this.#workouts.push(workout);

    // RENDER WORKOUT ON MAP AS MARKER
    // console.log(this)
    this._renderWorkoutMarker(workout);
    console.log(workout);

    // RENDER WORKOUT ON LIST
    this._renderWorkout(workout);

    // HIDE FORM + CLEAR DATA INPUT FIELDS

    this._hideForm();

    this._setLocalStorage()
  }
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 50,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        }).setContent(
          `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} on ${
            workout.description
          } with ${workout.distance} distance`
        )
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
         <h2 class="workout__title">${workout.description}</h2> 
         <div class="workout__details">
         <span class="workout__icon">${
           workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
         }</span>
         <span class="workout__value">${workout.distance}</span>
         <span class="workout__unit">km</span>
         </div>
         <div class="workout__details">
         <span class="workout__icon">⏱</span>
         <span class="workout__value">${workout.duration}</span>
         <span class="workout__unit">min</span>
         </div>`;

    if (workout.type === 'running')
      html += `
         <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`;

    if (workout.type === 'cycling')
      html += `
         <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>`;

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
   //  console.log(workoutEl);   

    if(!workoutEl) return

    const workout = this.#workouts.find(work => {
      return work.id === workoutEl.dataset.id;
    });

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

   //  workout.click(); 
   //  console.log(workout);
  }

  _setLocalStorage(){
     localStorage.setItem('workouts', JSON.stringify( this.#workouts))
  }

  _getLocalStorage(){
     const data = JSON.parse(localStorage.getItem('workouts')) 

     if(!data) return 

     this.#workouts = data 

     this.#workouts.forEach(work => {
        this._renderWorkout(work) 
      //   console.log(work);
     })
  }

  reset(){
      logoReset.addEventListener('click', function(){
         localStorage.removeItem('workouts')
         location.reload()
      })
  }
}

const app = new App();
