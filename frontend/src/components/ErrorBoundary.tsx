import React from 'react';
import { View, Text } from 'react-native';

export default class ErrorBoundary
extends React.Component<any, any>{

 constructor(props:any){
  super(props);

  this.state = {
   hasError:false
  };
 }

 static getDerivedStateFromError(){
  return {
   hasError:true
  };
 }

 componentDidCatch(error:any){
  console.log(error);
 }

 render(){

  if(this.state.hasError){

   return(
    <View
     style={{
      flex:1,
      justifyContent:'center',
      alignItems:'center',
      padding:20
     }}
    >
     <Text>
      Something went wrong.
      Restart the app.
     </Text>
    </View>
   );
  }

  return this.props.children;
 }
}