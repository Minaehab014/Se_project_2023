const { isEmpty } = require("lodash");
const { v4 } = require("uuid");
const db = require("../../connectors/db");
const roles = require("../../constants/roles");
const {getSessionToken}=require('../../utils/session')
const getUser = async function(req) {
   const sessionToken = getSessionToken(req);
   if (!sessionToken) {
  return res.status(301).redirect('/');
   }
  
   const user = await db.select('*')
   .from('se_project.sessions')
   .where('token', sessionToken)
   .innerJoin('se_project.users', 'se_project.sessions.userid', 'se_project.users.id')
   .innerJoin('se_project.roles', 'se_project.users.roleid', 'se_project.roles.id')
   .first();
  
   console.log('user =>', user)
   user.isStudent = user.roleid === roles.user;
   user.isAdmin = user.roleid === roles.admin;
   user.isSenior = user.roleid === roles.senior;
  
  return user; 
  }

module.exports = function (app) {
  // example
  app.get("/users", async function (req, res) {
    try {
       const user = await getUser(req);
      //const users = await db.select('*').from("se_project.users").where("id",'=',userid)    
      return res.status(200).json(user.userid);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not get users");
    }
   
  });

// rest password
app.put("/api/v1/password/reset", async (req,res)=>{
  const {newPassword} = req.body
  const user = await getUser(req)
  try{
await db("se_project.users").where("id","=",user.userid).update({password:newPassword})
return res.status(200).json({message:"Password Updated"})
  }
  catch(err){
    console.log(err)
    return res.status(400).send("Could not reset password")
  }
})

// get zones data
app.get("/api/v1/zones",async (req,res)=>{
  try{
   const zones_data = await db.select("*").from("se_project.zones").returning("*")
   return res.status(200).json(zones_data)
  }
  catch(err){
  return res.status(400).send("Cannot retrive data") 
  }
})

//Pay for subscription online
app.post("/api/v1/payment/subscription",async (req,res)=>{
  const {creditCardNumber,holderName,payedAmount,subType,zoneId} = req.body
  const user = await getUser(req)
  try{
    const Exist =  await db.select("*").from("se_project.subsription").where("userid", user.userid).andWhere("nooftickets", "<>", 0).first();
    if(Exist){
      return res.status(200).send("You Have a plan")
    }
    if(!Exist){
    if(user.roleid === 3){
      if(subType === "annual"){
        const sub_info = await db("se_project.subsription").insert({subtype:subType,zoneid:zoneId,userid:user.userid,nooftickets:100}).returning("*")
        await db("se_project.transactions").insert({amount:100,userid:user.userid,purchasediid:sub_info[0].id,purchasetype:"sub"})
        return res.status(200).send("Discount applied") 
         
       }
      
       if(subType ==="month"){
         const sub_info = await db("se_project.subsription").insert({subtype:subType,zoneid:zoneId,userid:user.userid,nooftickets:10}).returning("*")
         await db("se_project.transactions").insert({amount:40,userid:user.userid,purchasediid:sub_info[0].id,purchasetype:"sub"})
         return res.status(200).send("Discount applied") 
       }
      
       if(subType === "quarterly"){
         const sub_info = await db("se_project.subsription").insert({subtype:subType,zoneid:zoneId,userid:user.userid,nooftickets:50}).returning("*")
         await db("se_project.transactions").insert({amount:60,userid:user.userid,purchasediid:sub_info[0].id,purchasetype:"sub"})
         return res.status(200).send("Discount applied")
       }
    }    

else{
   
  if(subType === "annual"){
   const sub_info = await db("se_project.subsription").insert({subtype:subType,zoneid:zoneId,userid:user.userid,nooftickets:100}).returning("*")
   await db("se_project.transactions").insert({amount:payedAmount,userid:user.userid,purchasediid:sub_info[0].id,purchasetype:"sub"})
   return res.status(200).send("Done") 
    
  }
 
  if(subType ==="month"){
    const sub_info = await db("se_project.subsription").insert({subtype:subType,zoneid:zoneId,userid:user.userid,nooftickets:10}).returning("*")
    await db("se_project.transactions").insert({amount:payedAmount,userid:user.userid,purchasediid:sub_info[0].id,purchasetype:"sub"})
    return res.status(200).send("Done")  
  }
 
  if(subType === "quarterly"){
    const sub_info = await db("se_project.subsription").insert({subtype:subType,zoneid:zoneId,userid:user.userid,nooftickets:50}).returning("*")
    await db("se_project.transactions").insert({amount:payedAmount,userid:user.userid,purchasediid:sub_info[0].id,purchasetype:"sub"})
    return res.status(200).send("Done") 
  }
}
    }
  }
  catch(err){
    console.error(err);
return res.status(400).send("Error while subscription")
  }
})

//Pay for ticket online
app.post("/api/v1/payment/ticket",async (req,res)=>{
  const {creditCardNumber,holderName,payedAmount,Origin,Destination,tripDate} = req.body
  const user = await getUser(req)
  try{
    if(user.roleid===3){
      const new_amount = payedAmount/2
      const ticket_info = await db("se_project.tickets").insert({origin:Origin,destination:Destination,userid:user.userid,tripdate:tripDate}).returning("*")
      await db("se_project.transactions").insert({amount:new_amount,userid:user.userid,purchasediid:ticket_info[0].id,purchasetype:"online"})
      const ticket_id  = await db.select("id").from("se_project.tickets").where({origin:Origin,destination:Destination,userid:user.userid,tripdate:tripDate}).first()
      await db("se_project.rides").insert({status:"upcoming",origin:Origin,destination:Destination,userid:user.userid,ticketid:ticket_id.id,tripdate:tripDate})
      return res.status(200).json(ticket_info)
    }
    else{
     const ticket_info = await db("se_project.tickets").insert({origin:Origin,destination:Destination,userid:user.userid,tripdate:tripDate}).returning("*")
      await db("se_project.transactions").insert({amount:payedAmount,userid:user.userid,purchasediid:ticket_info[0].id,purchasetype:"online"})
      const ticket_id  = await db.select("id").from("se_project.tickets").where({origin:Origin,destination:Destination,userid:user.userid,tripdate:tripDate}).first()
      await db("se_project.rides").insert({status:"upcoming",origin:Origin,destination:Destination,userid:user.userid,ticketid:ticket_id.id,tripdate:tripDate})
      return res.status(200).json(ticket_info)
    }
  }
  catch(err){
    console.error(err)
    return res.status(400).send("Error while purchasing ticket")
  }
})

// pay for ticket by subscription
app.post("/api/v1/tickets/purchase/subscription",async (req,res)=>{
  const {subId,Origin,Destination,tripDate} = req.body
  const user = await getUser(req)
  try{
  const sub_info = await db.select("*").from("se_project.subsription").where("id",subId).first()
  if(sub_info.nooftickets===0){
    return res.status(200).send("Update your plan")
  }
 else{




  const x = await db("se_project.tickets").insert({origin:Origin,destination:Destination,userid:user.userid,tripdate:tripDate,subid:subId}).returning("*")
  //try
  
  await db("se_project.transactions").insert({amount:0,userid:user.userid,purchasediid:x[0].id,purchasetype:"paybysub"})
//

  await db("se_project.subsription").where("id","=",subId).update({
    nooftickets:(await db("se_project.subsription").where("id","=",subId).first()).nooftickets-1
  })
  const ticket_id  = await db.select("id").from("se_project.tickets").where({origin:Origin,destination:Destination,userid:user.userid,tripdate:tripDate}).first()
  await db("se_project.rides").insert({status:"upcoming",origin:Origin,destination:Destination,userid:user.userid,ticketid:ticket_id.id,tripdate:tripDate})
  return res.status(200).send("Done")
  }
}
  catch(err){
    console.error(err)
    return res.status(400).send("error while paying")
  }
})
// refund request
app.post('/api/v1/refund/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const ticket_info = await db.select("*").from('se_project.tickets').where('id','=', ticketId).first();
    const user = await getUser(req);
    const ride_info = await db.select("*").from("se_project.rides").where("ticketid",ticketId).andWhere("userid",user.userid).first()
    if(ride_info.status!=="upcoming"){
      return res.status(400).send("You can't refund this ticket")
    }
    else{
   if(ticket_info.subid !== null){
      const x = await db("se_project.refund_requests").insert({status:"pending",userid:user.userid,refundamount:0,ticketid:ticketId}).returning("*")
      return res.status(200).json(x);
   }
   else{
    const payed_amount = await db.select('*').from("se_project.transactions").where("purchasediid","=",ticketId).first()
    const y = await db("se_project.refund_requests").insert({status:"pending",userid:user.userid,refundamount:payed_amount.amount,ticketid:ticketId}).returning("*")
    return res.status(200).json(y);

   }
  }
  } catch (err) {
    console.error(err);
    res.status(400).send("Error in request");
  }
});

// request senior
app.post("/api/v1/senior/request",async (req,res)=>{
const{nationalId} = req.body
const user = await getUser(req)
try{

 const request= await db("se_project.senior_requests").insert({status:"pending",userid:user.userid,nationalid:nationalId})
  return res.status(200).send("Request sent");

}
catch(err){
  console.error(err)
  return res.status(400).send("Error in request");
}




})

// simulate ride
app.put("/api/v1/ride/simulate",async (req,res)=>{
const {Origin,Destination,tripDate} = req.body
const user = await getUser(req)
try{
const s = await db("se_project.rides").where("origin",Origin).andWhere("destination",Destination).andWhere("tripdate",tripDate).andWhere("userid",user.userid)
.update({status:"Completed"})
return res.status(200).send("Simulated Successfully");
}
catch(err){
console.error(err)
return res.status(400).send("Error in simulating ride");
}
})



//---------------------------------------------------------


//endpoint to add station
app.post("/api/v1/station" , async (req,res) =>{
  const {stationName} = req.body
  try {
     const new_created = await db("se_project.stations").insert({stationname:stationName,stationtype:"normal",stationstatus:"new"}).returning("*")
      return res.status(200).json(new_created);
  } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not add station");
  } 
})

//endpoint to update station
app.put("/api/v1/station/:stationId" , async (req,res)=>{
  try {
      const { stationId } = req.params;
      const { stationName } = req.body;
      const x = await db("se_project.stations").where({ id: stationId }).update({ stationname: stationName }).returning("*");
      return res.send(x);
  } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not update station");
  }
})

//endpoint to create route
app.post("/api/v1/route", async (req, res) => {
  const { newStationId,connectedStationId, routeName} = req.body;
  try{
    
    const connected_info = await db.select("*").from("se_project.stations").where("id",connectedStationId).first()
    if(connected_info.stationposition === 'end'){
    await db("se_project.stations").where("id",newStationId).update({stationposition:"end"})
    await db("se_project.stations").where("id",connectedStationId).update({stationposition:"middle"})
    await db("se_project.routes").insert({routename:routeName,fromstationid:newStationId,tostationid:connectedStationId})
    await db("se_project.routes").insert({routename:routeName,fromstationid:connectedStationId,tostationid:newStationId})
    }   
    else if (connected_info.stationposition === 'start'){
    await db("se_project.stations").where("id",newStationId).update({stationposition:"start"})
    await db("se_project.stations").where("id",connectedStationId).update({stationposition:"middle"})
    await db("se_project.routes").insert({routename:routeName,fromstationid:newStationId,tostationid:connectedStationId})
    await db("se_project.routes").insert({routename:routeName,fromstationid:connectedStationId,tostationid:newStationId})
    }
  return res.status(200).json({message:"Route created"});
  }
  catch(err){
  console.error(err)
  return res.status(400).json({message:"Could not create route"});
  }
});

  //endpoint to update route name
  app.put("/api/v1/route/:routeId", async (req, res) => {
    try {
      const { routeId } = req.params;
      const { routename } = req.body;
  
      // check that the route exists in  database
      const routeExists = await db("se_project.routes").where({ id: routeId }).first();
  
      if (!routeExists) {
        return res.status(400).send("The route does not exist");
      }
  
      // update  route in  database
      const x = await db("se_project.routes").where({ id: routeId }).update({ routename }).returning("*");
  
      res.json(x);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not update route");
    }
  });

  //endpoint to delete route
  app.delete("/api/v1/route/:routeId", async (req, res) => {
   const {routeId} = req.params
   try{
    const stations = await db.select("*").from("se_project.routes").where("id",routeId).first()
    const Exists = await db.select("*").from("se_project.routes").where("fromstationid",stations.tostationid).andWhere("tostationid",stations.fromstationid).first()
    const fromstation =  await db.select("*").from("se_project.stations").where("id",stations.fromstationid).first()
    const tostation = await db.select("*").from("se_project.stations").where("id",stations.tostationid).first()
    if(Exists){
    if(Exists && fromstation.stationposition ==="start"||tostation.stationposition==="start"||fromstation.stationposition==="end"||tostation.stationposition==="end"){
       await db.select("*").from("se_project.routes").where("id",routeId).del()
       return res.status(200).send("Route deleted")
    }
    if(Exists && fromstation.stationposition !=="start"&&tostation.stationposition!=="start"&&fromstation.stationposition!=="end"&&tostation.stationposition!=="end"){
      return res.status(200).send("Cannot Delete")
   }
  }
  else {
    if(tostation.stationposition === 'start' || tostation.stationposition === 'end' ){
      await db("se_project.stations").where("id",stations.fromstationid).update({stationposition:tostation.stationposition})
      await db("se_project.stations").where("id",stations.tostationid).update({stationposition:null})
       const deleted_route = await db.select("*").from("se_project.routes").where("id",routeId).del().returning("*")
       return res.status(200).send("Route Deleted")
     }
     if(fromstation.stationposition === 'start' || fromstation.stationposition === 'end' ){
      await db("se_project.stations").where("id",stations.fromstationid).update({stationposition:null})
      await db("se_project.stations").where("id",stations.tostationid).update({stationposition:fromstation.stationposition})
       const deleted_route = await db.select("*").from("se_project.routes").where("id",routeId).del().returning("*")
       return res.status(200).send("Route Deleted")
     }
  }






   }
   catch(err){
    console.error(err)
    return res.status(400).send("Could not delete route")
   }

  });

  
 //Accept/Reject Refund 
app.put("/api/v1/requests/refunds/:requestId",async (req,res)=>{
  const {requestId} = req.params
  const {refundstatus} = req.body
  try{
  if(refundstatus === "Accept"){
  const x = await db("se_project.refund_requests").where("id",requestId).update({status:"Accepted"}).returning("*")
  const request_info = await db.select("*").from("se_project.refund_requests").where("id",requestId).first()
  const ticket_info = await db.select("*").from("se_project.tickets").where("id",request_info.ticketid).first()
  if(request_info.refundamount === 0){
    await db("se_project.transactions").where("purchasediid",request_info.ticketid).andWhere("purchasetype","paybysub").del().returning("*")
    const sub = await db("se_project.subsription").where("id","=",ticket_info.subid).update({
      nooftickets:(await db("se_project.subsription").where("id","=",ticket_info.subid).first()).nooftickets+1})
      await db("se_project.rides").where("ticketid",ticket_info.id).del()
      return res.status(200).send("Done")
  }
else{
  await db("se_project.transactions").where("purchasediid",request_info.ticketid).andWhere("purchasetype","online").del().returning("*")
  await db("se_project.rides").where("ticketid", ticket_info.id).del();
  return res.status(200).send("Done")
}

  }
  else{
    await db("se_project.refund_requests").where("id",requestId).update({status:"rejected"})
    return res.status(200).send("Done")
  }

}
catch(err){
  console.error(err)
  return res.status(200).send("Error")
}
})

//Accept/Reject Senior
app.put("/api/v1/requests/senior/:requestId",async (req,res)=>{
  const {requestId} = req.params
  const {refundstatus} = req.body
  try{

    if(refundstatus === "Accept"){
    await db("se_project.senior_requests")
    .where( "id", requestId )
    .update({ status: refundstatus })
    .returning("*");
      
   const user_id = await db.select("*").from("se_project.senior_requests").where("id",requestId).first()
   await db("se_project.users").where("id",user_id.userid).update({roleid:3})


  return res.status(200).send("request accepted");
    }

else{

  return res.status(400).send("Could not refund.");

}
  }
 catch (e) {
  console.log(e.message);
  return res.status(400).send("Could not found.");
}

})
// Update zone id
app.put("/api/v1/zones/:zoneId", async (req, res) => {
  try {
    const { zoneId } = req.params;
    const { price } = req.body;
    const updateprice = await db("se_project.zones")
      .where( "id", zoneId )
      .update({ price: price })
      .returning("*");
      return res.status(200).json(updateprice);
    }
    catch (e) {
    console.log(e.message);
    return res.status(400).send("Could not found.");
}
});

// Delete station
app.delete("/api/v1/station/:stationId" , async(req,res)=> {
const {stationId} = req.params
let arr =[]
try{
  const station = await db.select("*").from("se_project.stations").where("id", stationId).first();
  if (station.stationtype === "normal" && station.stationposition === "middle") {
    const routes = await db.select("*").from("se_project.routes").where("fromstationid", stationId);
    for (let i = 0; i < routes.length; i++) {
      arr[i] = routes[i].tostationid;
    }
  await db("se_project.routes").insert({ routename: "new", fromstationid: arr[0], tostationid: arr[1] });
  await db("se_project.routes").insert({ routename: "new", fromstationid: arr[1], tostationid: arr[0] });
  await db("se_project.stations").where("id", stationId).del();
}
if(station.stationtype === "normal" && station.stationposition === "start"){
  const routes = await db.select("*").from("se_project.routes").where("fromstationid", stationId).first()
  await db("se_project.stations").where("id",routes.tostationid).update({stationposition:"start"})
  await db("se_project.stations").where("id", stationId).del();


}
if(station.stationtype === "normal" && station.stationposition === "end"){
  const routes = await db.select("*").from("se_project.routes").where("fromstationid", stationId).first()
  await db("se_project.stations").where("id",routes.tostationid).update({stationposition:"end"})
  await db("se_project.stations").where("id", stationId).del();
}

return res.status(200).send("Station removed")

}
catch(err){
console.error(err)
return res.status(200).send("Station cannot be removed")
}


  
});

}