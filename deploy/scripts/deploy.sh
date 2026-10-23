#!/bin/bash

ENVIRONMENT=$1

if [[ -z "$SENTRY_DSN" ]]; then
  echo "SENTRY_DSN must be set" >&2
  exit 1
fi

if [[ "$ENVIRONMENT" == "suppliertest" ]]; then
  VALUES_FILE="./deploy/infrastructure/helm/values/dev.yaml"
else
  VALUES_FILE="./deploy/infrastructure/helm/values/$ENVIRONMENT.yaml"
fi

deploy_branch() {
# Convert the branch name into a string that can be turned into a valid URL
  BRANCH_RELEASE_NAME=$(echo "$branch_name" | tr '[:upper:]' '[:lower:]' | sed 's:^\w*\/::' | tr -s ' _/[]().' '-' | cut -c1-18 | sed 's/-$//')
# Set the deployment host, this will add the prefix of the branch name e.g el-257-deploy-with-circleci or just main
  RELEASE_HOST="$BRANCH_RELEASE_NAME-laa-inquests-internal-ui-$ENVIRONMENT.apps.live.cloud-platform.service.justice.gov.uk"
# Set the ingress name, needs release name, namespace and -green suffix
  IDENTIFIER="$BRANCH_RELEASE_NAME-laa-inquests-internal-ui-$K8S_NAMESPACE-green"
  AUTH_POST_LOGOUT_URI="https://$RELEASE_HOST/"
  AUTH_REDIRECT_URI="https://$RELEASE_HOST/auth/callback"
  echo "Github ref: $branch_name; release name: $BRANCH_RELEASE_NAME; identifier: $IDENTIFIER; release host: $RELEASE_HOST"
  echo "Deploying commit: $GITHUB_SHA under release name: '$BRANCH_RELEASE_NAME'..."

  helm upgrade "$BRANCH_RELEASE_NAME" ./deploy/infrastructure/helm/. \
                --install --wait --timeout 10m \
                --namespace="${K8S_NAMESPACE}" \
                --values "$VALUES_FILE" \
                --set-string ingress.allowlist="${ALLOW_LIST//,/\\,}" \
                --set image.repository="$REGISTRY/$REPOSITORY" \
                --set image.tag="$IMAGE_TAG" \
                --set ingress.annotations."external-dns\.alpha\.kubernetes\.io/set-identifier"="$IDENTIFIER" \
                --set ingress.hosts[0].host="$RELEASE_HOST" \
                --set env.AUTH_CLIENT_ID="$AUTH_CLIENT_ID" \
                --set env.AUTH_CLIENT_SECRET="$AUTH_CLIENT_SECRET" \
                --set env.AUTH_DIRECTORY_URL="$AUTH_DIRECTORY_URL" \
                --set env.AUTH_POST_LOGOUT_URI="$AUTH_POST_LOGOUT_URI" \
                --set env.AUTH_REDIRECT_URI="$AUTH_REDIRECT_URI" \
                --set env.AWS_SECRETS_INQUESTS_API_ENTRA_CONFIG="api-entra-config-$ENVIRONMENT" \
                --set env.AWS_SECRETS_AUTH_CLIENT_ID="auth-client-id-$ENVIRONMENT" \
                --set env.AWS_SECRETS_AUTH_CLIENT_SECRET="auth-client-secret-$ENVIRONMENT" \
                --set env.AWS_SECRETS_AUTH_DIRECTORY_URL="auth-directory-url-$ENVIRONMENT" \
                --set env.AWS_SECRETS_REDIS_SECRET="inquests-internal-ui-$ENVIRONMENT-redis-ec-cluster" \
                --set env.AWS_SECRETS_SESSION_SECRET="session-secret-$ENVIRONMENT" \
                --set env.AWS_SECRETS_SESSION_LOG_SECRET="session-log-secret-$ENVIRONMENT" \
                --set env.SERVICE_NAME="$SERVICE_NAME" \
                --set env.DEPARTMENT_NAME="$DEPARTMENT_NAME" \
                --set env.DEPARTMENT_URL="$DEPARTMENT_URL" \
                --set env.CONTACT_EMAIL="$CONTACT_EMAIL" \
                --set env.CONTACT_PHONE="$CONTACT_PHONE" \
                --set env.ENVIRONMENT="$ENVIRONMENT" \
                --set env.INQUESTS_API_URL="$INQUESTS_API_URL" \
                --set env.SERVICE_URL="$SERVICE_URL" \
                --set env.SESSION_NAME="$SESSION_NAME" \
                --set env.SENTRY_DSN="$SENTRY_DSN" \
                --set env.NODE_ENV="$NODE_ENV"
}

deploy_main() {
  RELEASE_HOST="laa-inquests-internal-ui-$ENVIRONMENT.apps.live.cloud-platform.service.justice.gov.uk"
  IDENTIFIER="laa-inquests-internal-ui-$K8S_NAMESPACE-green"
  AUTH_POST_LOGOUT_URI="https://$RELEASE_HOST/"
  AUTH_REDIRECT_URI="https://$RELEASE_HOST/auth/callback"
  helm upgrade laa-inquests-internal-ui ./deploy/infrastructure/helm/. \
                          --install --wait --timeout 10m \
                          --namespace="${K8S_NAMESPACE}" \
                          --values "$VALUES_FILE" \
                          --set-string ingress.allowlist="${ALLOW_LIST//,/\\,}" \
                          --set image.repository="$REGISTRY/$REPOSITORY" \
                          --set image.tag="$IMAGE_TAG" \
                          --set ingress.annotations."external-dns\.alpha\.kubernetes\.io/set-identifier"="$IDENTIFIER" \
                          --set ingress.hosts[0].host="$RELEASE_HOST" \
                          --set env.AUTH_CLIENT_ID="$AUTH_CLIENT_ID" \
                          --set env.AUTH_CLIENT_SECRET="$AUTH_CLIENT_SECRET" \
                          --set env.AUTH_DIRECTORY_URL="$AUTH_DIRECTORY_URL" \
                          --set env.AUTH_POST_LOGOUT_URI="$AUTH_POST_LOGOUT_URI" \
                          --set env.AUTH_REDIRECT_URI="$AUTH_REDIRECT_URI" \
                          --set env.AWS_SECRETS_INQUESTS_API_ENTRA_CONFIG="api-entra-config-$ENVIRONMENT" \
                          --set env.AWS_SECRETS_AUTH_CLIENT_ID="auth-client-id-$ENVIRONMENT" \
                          --set env.AWS_SECRETS_AUTH_CLIENT_SECRET="auth-client-secret-$ENVIRONMENT" \
                          --set env.AWS_SECRETS_AUTH_DIRECTORY_URL="auth-directory-url-$ENVIRONMENT" \
                          --set env.AWS_SECRETS_REDIS_SECRET="inquests-internal-ui-$ENVIRONMENT-redis-ec-cluster" \
                          --set env.AWS_SECRETS_SESSION_SECRET="session-secret-$ENVIRONMENT" \
                          --set env.AWS_SECRETS_SESSION_LOG_SECRET="session-log-secret-$ENVIRONMENT" \
                          --set env.SERVICE_NAME="$SERVICE_NAME" \
                          --set env.DEPARTMENT_NAME="$DEPARTMENT_NAME" \
                          --set env.DEPARTMENT_URL="$DEPARTMENT_URL" \
                          --set env.CONTACT_EMAIL="$CONTACT_EMAIL" \
                          --set env.CONTACT_PHONE="$CONTACT_PHONE" \
                          --set env.ENVIRONMENT="$ENVIRONMENT" \
                          --set env.INQUESTS_API_URL="$INQUESTS_API_URL" \
                          --set env.SERVICE_URL="$SERVICE_URL" \
                          --set env.SESSION_NAME="$SESSION_NAME" \
                          --set env.SENTRY_DSN="$SENTRY_DSN" \
                          --set env.NODE_ENV="$NODE_ENV"
}

releaseTag="^[0-9]+[.][0-9]+[.][0-9]+$"

branch_name="$GITHUB_HEAD_REF" # Branch name if this is a pull-request event
if [ -z "$branch_name" ]; then
  branch_name="$GITHUB_REF_NAME" # Branch name if this is a push event
fi

if  [[ ("$ENVIRONMENT" == 'dev') && "$branch_name" != "main" ]] 
then
  if deploy_branch; then
    echo "Deploy succeeded"
  else
    echo "Deploy failed. Attempting rollback"
    if helm rollback "$BRANCH_RELEASE_NAME"; then
      echo "Rollback succeeded. Retrying deploy"
      deploy_branch
    else
      echo "Rollback failed. Consider manually running 'helm delete $BRANCH_RELEASE_NAME'"
      exit 1
    fi
  fi
else
  deploy_main
fi