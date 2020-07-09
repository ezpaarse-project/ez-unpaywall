#!/bin/bash

export POSTGRES_DB="unpaywall"
export POSTGRES_USER="postgres"
export POSTGRES_PASSWORD="postgres"
export POSTGRES_PORT=5432
export API_PORT=8080
export API_KEY_UPW="api_key"

if [[ -f unpaywall.local.env.sh ]] ; then
  source unpaywall.local.env.sh
fi