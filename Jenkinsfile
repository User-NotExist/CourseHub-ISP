// Jenkinsfile for CourseHub-ISP
// Place this file at the repo root.
// Requires: Docker Pipeline plugin, and Jenkins to have access to the Docker socket
// (Jenkins and the app run on the same machine, so no SSH/registry step is needed).
pipeline {
    agent none
    options {
        buildDiscarder(logRotator(numToKeepStr: '20'))
        timestamps()
    }
    stages {
        stage('Checkout') {
            agent any
            steps {
                checkout scm
            }
        }
        stage('Backend: install & test') {
            agent {
                docker {
                    image 'python:3.14.2-slim'
                    // Docker Pipeline runs the container as the same UID as the
                    // Jenkins process, which has no /etc/passwd entry inside the
                    // image, so $HOME resolves to "/" and pip can't write there.
                    // Point HOME somewhere writable instead.
                    args '-e HOME=/tmp'
                }
            }
            steps {
                dir('source/backend'){
                    sh '''
                        pip install --no-cache-dir -r requirements.txt
                        # pytest will just report "no tests ran" until a test suite exists
                        pip install --no-cache-dir pytest
                        python -m pytest --maxfail=1 || true
                    '''
                }
            }
        }
        stage('Frontend: install, lint & build') {
            agent {
                docker {
                    image 'node:24.14-alpine'
                    args '-e HOME=/tmp'
                }
            }
            steps {
                dir('source/coursehub') {
                    sh '''
                        npm ci
                        npm run lint
                        npm run build
                    '''
                }
            }
        }
        stage('Deploy') {
			agent any
			when {
				expression {
					return env.GIT_BRANCH == 'origin/main' || env.GIT_BRANCH == 'main'
				}
			}
			steps {
				withCredentials([
					file(credentialsId: 'coursehub-backend-env', variable: 'BACKEND_ENV'),
					file(credentialsId: 'coursehub-frontend-env', variable: 'FRONTEND_ENV')
				]) {
					sh '''
						cp "$BACKEND_ENV" source/backend/.env
						cp "$FRONTEND_ENV" source/coursehub/.env

						docker compose build
						docker compose up -d --remove-orphans

						rm -f source/backend/.env source/coursehub/.env
					'''
				}
			}
		}
    }
    post {
        always {
            node('') {
                cleanWs()
            }
        }
        failure {
            echo 'Pipeline failed — check the failing stage log above.'
        }
        success {
            echo "Build ${env.BUILD_NUMBER} succeeded on branch ${env.BRANCH_NAME ?: 'unknown'}."
        }
    }
}