async function fetchFlightData() {
  let response = await fetch('/api/flights');
  let data = await response.json();
  console.log(data);
  return data;
}

async function renderFlightData() {
  var flightData = await fetchFlightData();

  if (flightData && Array.isArray(flightData) && flightData.length > 0) {
      var ul = document.createElement('ul');
      flightData.forEach(function (flight) {
          var li = document.createElement('li');
          console.log("In the for each");
          if (flight) {
              li.innerHTML = '<strong>Price:</strong> $' + flight.price + '<br>'+
                '<strong>DPT Time:</strong> ' + flight.depTime + '<br>'+'<strong>DST Time:</strong> ' + flight.desTime + '<br>'+ '<strong>Ticket Number:</strong> ' + flight.numTickets + '<br>'+'<strong>Dpt Airport:</strong> ' + flight.dptAirport + '<br>'+'<strong>Dst Airport:</strong> ' + flight.dstAirport + '<br>' + '<a href="/checkout" value="${flight.flightId}"> <button> Select Flight </button> <a>';
                  // li.innerHTML = '<strong>Price:</strong> $' + flight.price + '<br>';
              ul.appendChild(li);
          }
      }); // forEach
      document.getElementById('flightInfo').appendChild(ul);
  } else {
      var p = document.createElement('p');
      p.textContent = 'No flight data.';
      document.getElementById('flightInfo').appendChild(p);
  }
}

function setMinDate() {
  let currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + 1);
  document.getElementById("departureDate").min = currentDate.toISOString().split("T")[0];
}

setMinDate();

renderFlightData();

