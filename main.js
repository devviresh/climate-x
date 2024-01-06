const api_key = "f6a3330cf9975e34f862e389db6545b0";
const week = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const month = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

const getDate = () => {
    let date = document.getElementById("date")
    const today = new Date()
    date.innerText = `${week[today.getDay()]}, ${today.getDate()} ${month[today.getMonth()]}`
}
getDate()

const getCities = async (searchText) => {
    const responce = await fetch(
        `http://api.openweathermap.org/geo/1.0/direct?q=${searchText}&limit=5&appid=${api_key}`
    );
    // const cities = await responce.json()
    // console.log(cities)
    return /*cities*/ responce.json();
};

const getCurrentWeatherData = async ({ lat, lon, name }) => {
    // const city = "pune";
    const url =
        lat && lon
            ? `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${api_key}&units=metric`
            : `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${api_key}&units=metric`;
    const responce = await fetch(url);
    return responce.json();
};

const getHourlyForecast = async ({ name: city }) => {
    const responce = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${api_key}&units=metric`
    );
    const data = await responce.json();
    //   console.log(data);
    return data.list.map((forecast) => {
        const {
            main: { temp, temp_max, temp_min },
            dt,
            dt_txt,
            weather: [{ description, icon }],
        } = forecast;
        return { temp, temp_max, temp_min, dt, dt_txt, description, icon };
    }); //go through each "data.list" items i.e. forecast, extraxt useful info and make an another list
};

const formatTemp = (temp) => `${temp?.toFixed(1)}°`;

const current_loadData = ({
    name,
    main: { temp, temp_max, temp_min },
    weather: [{ description }],
}) => {
    const current = document.querySelector("#current");
    current.querySelector(".city").textContent = name;
    current.querySelector(".temp").textContent = formatTemp(temp);
    current.querySelector(".desc").textContent = description;
    current.querySelector(".high-low").textContent = `High: ${formatTemp(
        temp_max
    )} / Low: ${formatTemp(temp_min)}`;
};

const hourly_loadData = ({ main: { temp: tempNow }, weather: [{ icon: iconNow }] }, hourlyData) => {
    const timeFormatter = Intl.DateTimeFormat("en", {
        hour12: true,
        hour: "numeric",
    });

    const hourlyContainer = document.querySelector(".hourly-container");
    let hourlyTime = `<article>
  <h3 class="time">Now</h3>
  <img class="icon" src="http://openweathermap.org/img/wn/${iconNow}@2x.png" alt="icon">
  <p class="hourly-temp">${formatTemp(tempNow)}</p>
</article>`;
    for (let { temp, icon, dt_txt } of hourlyData.slice(2, 15)) {
        hourlyTime += `<article>
        <h3 class="time">${timeFormatter.format(new Date(dt_txt))}</h3>
        <img class="icon" src="http://openweathermap.org/img/wn/${icon}@2x.png" alt="icon">
        <p class="hourly-temp">${formatTemp(temp)}</p>
    </article>`;
    }
    hourlyContainer.innerHTML = hourlyTime;
};

const calculateDailyForecast = (hourlyData) => {
    let map = new Map();
    for (let forecast of hourlyData) {
        const [date] = forecast.dt_txt.split(" ");
        const dayOfTheWeek = week[new Date(date).getDay()];
        if (map.has(dayOfTheWeek)) {
            let forecastForTheDay = map.get(dayOfTheWeek);
            forecastForTheDay.push(forecast);
            map.set(dayOfTheWeek, forecastForTheDay);
        } else {
            map.set(dayOfTheWeek, [forecast]);
        }
    }
    // console.log(map)

    let dailyForecast = [];
    for (let [key, value] of map) {
        let minTemp = Math.min(...Array.from(value, (val) => val.temp_min));
        let maxTemp = Math.max(...Array.from(value, (val) => val.temp_max));
        let icon = value.find((v) => v.icon).icon;
        dailyForecast.push([key, icon, `${maxTemp.toFixed(1)} / ${minTemp.toFixed(1)} °c`]);
    }
    // console.log(dailyForecast)
    return dailyForecast;
};

const weekly_loadData = (hourlyData) => {
    const weeklyContainer = document.querySelector(".weekly-container");
    const dailyForecast = calculateDailyForecast(hourlyData);
    let dayWiseInfo = ``;
    let index = 0;
    for (let [day, icon, minMaxTemp] of dailyForecast) {
        
        dayWiseInfo += `<article class="day-forecast">
        <h3>${index === 0 ? "Today" : day}</h3>
        <img class="icon" src="http://openweathermap.org/img/wn/${icon}@2x.png" alt="icon" />
        <p>${minMaxTemp}</p>
      </article>`;
        index = 1;
    }
    weeklyContainer.innerHTML = dayWiseInfo;
};

const feelHumid_loadData = ({ main: { feels_like, humidity } }) => {
    document.getElementById("feel-temp").innerText = formatTemp(feels_like);
    document.getElementById("humid").textContent = `${humidity}%`;
};

const loadDataByUserLocation = () => {
    navigator.geolocation.getCurrentPosition(({coords}) => {
        const {latitude:lat, longitude:lon} = coords;
        selectedCity = {lat,lon};
        loadData();
    }, error => console.log(error))
}

const loadData = async ()=>{
    const currentData = await getCurrentWeatherData(selectedCity);
    current_loadData(currentData);
    const hourlyData = await getHourlyForecast(currentData);
    hourly_loadData(currentData, hourlyData);
    weekly_loadData(hourlyData);
    feelHumid_loadData(currentData);
}

function deBounce(func) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            func.apply(this, args);
        }, 500);
    };
}

const onSearch = async (event) => {
    let { value } = event.target;

    if (!value) {
        selectedCity = null;
        selectedCityText = "";
    }
    if (value && selectedCityText !== value) {
        const listOfCities = await getCities(value);

        let options = "";
        for (let { lat, lon, name, state, country } of listOfCities) {
            options += `<option city-details='${JSON.stringify({
                lat,
                lon,
                name,
            })}' value="${name}, ${state}, ${country}"></option>`;
        }

        document.querySelector("#cities").innerHTML = options;
    }
};

let selectedCityText;
let selectedCity;

const onCitySelection = (event) => {
    selectedCityText = event.target.value;
    let options = document.querySelectorAll("#cities > option");
    if (options?.length) {
        let selectedOption = Array.from(options).find((opt) => opt.value === selectedCityText);
        selectedCity = JSON.parse(selectedOption.getAttribute("city-details"));
        loadData();
    }
    // loadData();
};

const deBounceSearch = deBounce((event) => onSearch(event));

document.addEventListener("DOMContentLoaded", async () => {
    loadDataByUserLocation();
    const searchInput = document.getElementById("search");
    searchInput.addEventListener("input", deBounceSearch);
    searchInput.addEventListener("change", onCitySelection);


});
