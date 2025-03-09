'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
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
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

class App {
  #map;
  #mapEvent;
  #workout = [];
  constructor() {
    this._getPosition();
    this._getLocalStorage();
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your location');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coord = [latitude, longitude];
    this.#map = L.map('map').setView(coord, 17);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    this.#workout.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();

    const validInput = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !validInput(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Input have to be a positive number');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInput(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Input have to be a positive number');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    this.#workout.push(workout);

    this._renderWorkout(workout);
    this._renderWorkoutMarker(workout);
    this._hideForm();
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}${workout.description}`
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
          </div>
    `;
    if (workout.type === 'running') {
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
        </li>
      `;
    }

    if (workout.type === 'cycling') {
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
        </li>
      `;
    }
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const workout = this.#workout.find(
      work => work.id === workoutEl.dataset.id
    );
    this.#map.setView(workout.coords, 17, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
    // workout.click();
  }
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workout));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;

    this.#workout = data;

    this.#workout.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}
const app = new App();

// class Workout {
//     date = new Date()
//     id = (Date.now() + '').slice(-10)
//     clicks = 0;
//     constructor(coords, distance, duration) {
//         this.coords = coords
//         this.distance = distance
//         this.duration = duration
//     }
//     _setDescription() {
//         const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
//         this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]}${this.date.getDate()}`
//     }
//     click() {
//         this.clicks++;
//     }
// }

// class Running extends Workout {
//     type = 'running'
//     constructor(coords, distance, duration, cadence) {
//         super(coords, distance, duration)
//         this.cadence = cadence
//         this.calcPace()
//         this._setDescription()
//     }
//     calcPace() {
//         this.pace = this.duration / this.distance
//         return this.pace
//     }
// }

// class Cycling extends Workout {
//     type = 'cycling'
//     constructor(coords, distance, duration, elevationgain) {
//         super(coords, distance, duration)
//         this.elevationgain = elevationgain
//         this.calcSpeed()
//         this._setDescription()
//     }
//     calcSpeed() {
//         this.speed = this.distance / (this.duration / 60)
//         return this.speed
//     }

// }
// const run1 = new Running([500, -123], 5.5, 50, 178)
// console.log(run1);

// class App {
//     #map;
//     #mapEvent;
//     #workouts = [];
//     constructor() {
//         this._getPosition()

//     this.getLocalStorage()

//         form.addEventListener('submit', this._newWorkout.bind(this));
//         inputType.addEventListener('change', this._toggleEvlevationField)
//         containerWorkouts.addEventListener('click', this._movToMarker.bind(this))
//     }

//     _getPosition() {

//         if(navigator.geolocation)
//         navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function() {
//             alert('We could not find your location')
//         })
//     }

//     _loadMap(position) {
//             console.log(position);
//             const{latitude} = position.coords
//             const{longitude} = position.coords
//             console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

//             const coords = [latitude, longitude]

//             this.#map = L.map('map').setView(coords, 13);

//             L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
//                 attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
//             }).addTo(this.#map);

//             this.#map.on('click', this._showForm.bind(this))

//             this.#workouts.forEach(work => {
//                 this.renderWorkoutMarker(work)
//             })
//     }

//     _showForm(mapE) {
//         this.#mapEvent = mapE
//         form.classList.remove('hidden')
//         inputDistance.focus()
//     }

//     _hideForm() {
//         inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = "";
//         form.style.display = 'none '
//         form.classList.add('hidden')
//         setTimeout(() => form.style.display = 'grid' , 1000)
//     }

//     _toggleEvlevationField() {
//         inputElevation.closest('.form__row').classList.toggle('form__row--hidden')
//         inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
//     }

//     _newWorkout(e) {

//         const validInput = (...input) => input.every(inp => Number.isFinite(inp))
//         const allInput = (...inputs) => inputs.every(inp => inp > 0)

//         e.preventDefault()

//         const {lat, lng} = this.#mapEvent.latlng
//         const type = inputType.value
//         const distance = +inputDistance.value
//         const duration = +inputDuration.value
//         let workout;

//         if(type === 'running') {
//             const cadence = +inputCadence.value

//             if(!validInput(distance, duration, cadence) || !allInput(distance, duration, cadence)){
//                 return alert('Input has to be in postive number')
//             }
//             workout = new Running([lat, lng], distance, duration, cadence)
//         }

//         if(type === 'cycling') {
//             const elevation = +inputElevation.value

//             if(!validInput(distance, duration, elevation) || !allInput(distance, duration)){
//                 return alert('Input has to be in postive number')
//             }
//             workout = new Cycling([lat, lng], distance, duration, elevation)
//         }

//         this.#workouts.push(workout)
//         console.log(workout);

//         this.renderWorkoutMarker(workout)

//         this.renderWorkout(workout)

//         this._hideForm()

//         this.setLocalStorage()

//     }
//     renderWorkoutMarker(workout) {
//         L.marker(workout.coords).addTo(this.#map)
//         .bindPopup(
//         L.popup({
//             maxWidth: 200,
//             minWidth: 100,
//             autoClose: false,
//             closeOnClick: false,
//             className: `${workout.type}-popup`
//         }))
//         .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️': '🚴‍♀️'}${workout.description}`)
//         .openPopup();
//     }

//     renderWorkout(workout) {
//         let html = `
//          <li class="workout workout--${workout.type}" data-id=${workout.id}>
//           <h2 class="workout__title">Running on April 14</h2>
//           <div class="workout__details">
//             <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️': '🚴‍♀️'}</span>
//             <span class="workout__value">${workout.distance}</span>
//             <span class="workout__unit">km</span>
//           </div>
//           <div class="workout__details">
//             <span class="workout__icon">⏱</span>
//             <span class="workout__value">${workout.duration}</span>
//             <span class="workout__unit">min</span>
//           </div>
//         `
//         if(workout.type === 'running') {
//             html += `
//             <div class="workout__details">
//             <span class="workout__icon">⚡️</span>
//             <span class="workout__value">${workout.pace.toFixed(1)}</span>
//             <span class="workout__unit">min/km</span>
//           </div>
//           <div class="workout__details">
//             <span class="workout__icon">🦶🏼</span>
//             <span class="workout__value">${workout.cadence}</span>
//             <span class="workout__unit">spm</span>
//           </div>
//         </li>
//             `
//         }
//         if(workout.type === 'cycling') {
//             html += `
//             <div class="workout__details">
//             <span class="workout__icon">⚡️</span>
//             <span class="workout__value">${workout.speed.toFixed(1)}</span>
//             <span class="workout__unit">km/h</span>
//           </div>
//           <div class="workout__details">
//             <span class="workout__icon">⛰</span>
//             <span class="workout__value">${workout.elevationgain}</span>
//             <span class="workout__unit">m</span>
//           </div>
//         </li>
//             `
//         }
//         form.insertAdjacentHTML('afterend', html)
//     }

//     _movToMarker(e) {
//         const workoutEl = e.target.closest('.workout')

//         if(!workoutEl) return

//         const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id)

//         this.#map.setView(workout.coords, 13, {
//             animate: true,
//             pan: {
//                 duration: 1
//             }

//         })

//         // workout.click();
//     }

//     setLocalStorage() {
//         localStorage.setItem('workouts', JSON.stringify(this.#workouts))
//     }

//     getLocalStorage() {
//        const data = JSON.parse(localStorage.getItem('workouts'))
//        console.log(data);

//         if(!data) return

//         this.#workouts = data

//         this.#workouts.forEach(work => {
//             this.renderWorkout(work)
//         })
//     }

//     reset() {
//         localStorage.removeItem('workout')
//         location.reload()
//     }
// }
