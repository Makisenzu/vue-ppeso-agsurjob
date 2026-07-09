import axios from 'axios';

const psgcApi = axios.create({
  baseURL: 'https://psgc.cloud/api/v2',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export default psgcApi