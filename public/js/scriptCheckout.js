async function getTicket() {
   let url = `/api/flights`;
   let response = await fetch(url);
   let data = await response.json();
   let bookingInfo = document.querySelector("#booking-info");
   // bookingInfo.innerHTML = `<h3>Flight Information</h3>
   //        <% if (typeof ticket != "undefined") { %>
   //        <input type="hidden" name="confirmation" value="<%=ticket[0].tempConf%>" >
   //        <p>Destination: <%=ticket[0].city%>, <%=ticket[0].state%></p>
   //        <p>Departure Time: <%=ticket[0].tempDptTime%></p>
   //          <% } %>`;
  bookingInfo.innerHTML += `<h3>Flight Information</h3>
  <p>Destination: ${data[0].city}, ${data[0].state} </p>
  <p>Departure Time: ${data[0].depTime} </p>`;
} //getTicket

getTicket();

// document.getElementById("checkout-button").addEventListener("click", function() {
//   document.getElementById("booking-info").innerHTML="";
// });
                                                     
